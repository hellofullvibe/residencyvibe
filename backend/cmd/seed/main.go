// Command seed imports the interview question CSV into the questions table.
//
//	Usage:
//	  go run ./cmd/seed -csv "/path/to/Sorting Interview Questions - Sheet1.csv" \
//	     [-db "postgres://..."] [-default-specialty "Internal Medicine"] [-year 2026]
package main

import (
	"context"
	"encoding/csv"
	"flag"
	"io"
	"log"
	"os"
	"strings"

	"github.com/gulam/interviewprep/backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

type colMapping struct {
	category string
	question int // column index of question cell
	programs int // column index of programs cell (-1 if none)
}

var mapping = []colMapping{
	{"About You", 0, 1},
	{"About Program", 2, 3},
	{"Hobbies", 4, 5},
	{"Situation", 6, 7},
	{"Medical", 8, 9},
	{"Social", 10, 11},
	{"Experience", 12, 13},
	{"Ask Them", 14, -1},
}

func main() {
	var (
		csvPath   = flag.String("csv", "", "path to the interview questions CSV")
		dbURL     = flag.String("db", os.Getenv("DATABASE_URL"), "Supabase/Postgres connection string")
		specialty = flag.String("default-specialty", "Internal Medicine", "default specialty for imported questions")
		year      = flag.Int("year", 2026, "match year")
		dryRun    = flag.Bool("dry-run", false, "print what would be inserted without writing")
	)
	flag.Parse()

	if *csvPath == "" {
		log.Fatal("--csv is required")
	}
	if *dbURL == "" && !*dryRun {
		log.Fatal("DATABASE_URL (--db) is required")
	}

	f, err := os.Open(*csvPath)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.FieldsPerRecord = -1
	r.LazyQuotes = true

	header, err := r.Read()
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("headers (%d cols): %v", len(header), header)

	ctx := context.Background()
	var pool *pgxpool.Pool
	if !*dryRun {
		pool, err = db.Connect(ctx, *dbURL)
		if err != nil {
			log.Fatalf("db: %v", err)
		}
		defer pool.Close()
	}

	inserted := 0
	skipped := 0
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("read error: %v", err)
			break
		}

		for _, m := range mapping {
			text, ok := questionCell(record, m.question)
			if !ok {
				continue
			}
			parts := splitVariants(text)
			if len(parts) == 0 {
				skipped++
				continue
			}
			main := parts[0]
			variants := parts[1:]

			var progs []string
			if m.programs >= 0 {
				progs = parsePrograms(record[m.programs])
			}
			if progs == nil {
				progs = []string{}
			}

			if *dryRun {
				log.Printf("[%s] %s (variants=%d, programs=%d)", m.category, main, len(variants), len(progs))
				inserted++
				continue
			}

			tag, err := pool.Exec(ctx, `
				insert into questions (text, variants, category, specialty, year, programs)
				values ($1, $2, $3, $4, $5, $6)
				on conflict do nothing`,
				main, variants, m.category, *specialty, *year, progs)
			if err != nil {
				log.Printf("insert error for %q: %v", main, err)
				continue
			}
			if tag.RowsAffected() > 0 {
				inserted++
			}
		}
	}
	log.Printf("done. inserted=%d skipped=%d", inserted, skipped)
}

// questionCell returns the trimmed question text for a column if present.
func questionCell(record []string, idx int) (string, bool) {
	if idx >= len(record) {
		return "", false
	}
	s := strings.TrimSpace(record[idx])
	if s == "" {
		return "", false
	}
	// skip helper notes that aren't real questions
	lower := strings.ToLower(s)
	if strings.Contains(lower, "specific to candidates") && !strings.Contains(s, "?") {
		return "", false
	}
	return s, true
}

// splitVariants splits a multi-question cell into [main, ...variants].
func splitVariants(s string) []string {
	var out []string
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// further split lines that contain two questions glued with " ? "
		for _, part := range strings.Split(line, "  ") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			out = append(out, part)
		}
	}
	// dedupe consecutive
	clean := []string{}
	for _, v := range out {
		if len(clean) == 0 || clean[len(clean)-1] != v {
			clean = append(clean, v)
		}
	}
	return clean
}

// parsePrograms parses a program list cell into a cleaned, deduped slice.
func parsePrograms(s string) []string {
	seen := map[string]bool{}
	var out []string
	for _, raw := range strings.Split(s, ",") {
		p := strings.TrimSpace(raw)
		p = strings.TrimPrefix(p, "any connection")
		p = strings.TrimSpace(strings.Trim(p, "\n"))
		if p == "" || seen[p] {
			continue
		}
		seen[p] = true
		out = append(out, p)
	}
	return out
}
