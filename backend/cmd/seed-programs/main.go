// Command seed-programs imports the program->institutional-setting mapping CSV
// into the programs table.
//
//	Usage:
//	  go run ./cmd/seed-programs -csv "/path/to/IM Residency Match Programs - Vibe - Sheet3.csv" \
//	     [-db "postgres://..."]
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
)

var settingNormalize = map[string]string{
	"community-based":                       "Community Based",
	"community based":                       "Community Based",
	"community":                             "Community Based",
	"community-based university affiliated": "Community Based University Affiliated",
	"community based university affiliated": "Community Based University Affiliated",
	"university based":                      "University Based",
	"university":                            "University Based",
	"military based":                        "Military Based",
	"military":                              "Military Based",
	"other":                                 "Other",
}

func normalizeSetting(raw string) string {
	key := strings.ToLower(strings.TrimSpace(raw))
	if v, ok := settingNormalize[key]; ok {
		return v
	}
	return strings.TrimSpace(raw)
}

func main() {
	var (
		csvPath = flag.String("csv", "", "path to the programs CSV")
		dbURL   = flag.String("db", os.Getenv("DATABASE_URL"), "Supabase/Postgres connection string")
		dryRun  = flag.Bool("dry-run", false, "print what would be inserted without writing")
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

	if _, err := r.Read(); err != nil { // skip header
		log.Fatal(err)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, *dbURL)
	if err != nil {
		if *dryRun {
			pool = nil
		} else {
			log.Fatalf("db: %v", err)
		}
	}

	inserted, skipped := 0, 0
	for {
		record, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("read error: %v", err)
			break
		}
		if len(record) < 2 {
			continue
		}
		name := strings.TrimSpace(record[0])
		setting := normalizeSetting(record[1])
		if name == "" || setting == "" {
			skipped++
			continue
		}

		if *dryRun {
			log.Printf("%s -> %s", name, setting)
			inserted++
			continue
		}

		tag, err := pool.Exec(ctx, `
			insert into programs (name, institutional_setting)
			values ($1, $2)
			on conflict (name) do nothing`, name, setting)
		if err != nil {
			log.Printf("insert error for %q: %v", name, err)
			continue
		}
		if tag.RowsAffected() > 0 {
			inserted++
		} else {
			skipped++
		}
	}
	log.Printf("done. inserted=%d skipped=%d", inserted, skipped)
}
