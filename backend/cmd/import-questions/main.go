// Command import-questions imports the residency question CSV into the
// questions table. Program names are matched to the programs mapping
// (normalized, punctuation-insensitive) and stored as canonical names; the
// Settings percentages are stored as question weight points (percentage x10).
//
//	Usage:
//	  go run ./cmd/import-questions -csv "/path/to/Working for residency.xlsm - Final (2).csv" \
//	     [-db "postgres://..."] [-dry-run]
package main

import (
	"context"
	"encoding/csv"
	"flag"
	"io"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/gulam/interviewprep/backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	reSpaces = regexp.MustCompile(`\s*-\s*`)
	reJunk   = regexp.MustCompile("[\t\r\n ]+")
	rePunct  = regexp.MustCompile("[,\u2019\u2018'\"&/()]+")
	reDash   = regexp.MustCompile(`[-]+`)
)

func compact(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "\u2013", "-")
	s = strings.ReplaceAll(s, "\u2014", "-")
	s = reSpaces.ReplaceAllString(s, "-")
	s = reDash.ReplaceAllString(s, "")
	s = reJunk.ReplaceAllString(s, "")
	return rePunct.ReplaceAllString(s, "")
}

// settingsCols maps a setting label to its weight column on questions.
var settingsCols = map[string]string{
	"Community Based":                       "setting_community_based",
	"University Based":                      "setting_university_based",
	"Military Based":                        "setting_military_based",
	"Community Based University Affiliated": "setting_cb_university_affiliated",
	"Other":                                 "setting_other",
}

func parseSettings(s string) map[string]int {
	out := map[string]int{}
	for _, p := range strings.Split(s, ",") {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		parts := strings.SplitN(p, ":", 2)
		if len(parts) != 2 {
			continue
		}
		setting := strings.TrimSpace(parts[0])
		pctStr := strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(parts[1]), "%"))
		pct, err := strconv.ParseFloat(pctStr, 64)
		if err != nil {
			continue
		}
		if _, ok := settingsCols[setting]; ok && pct > 0 {
			out[setting] = int(pct*10 + 0.5) // percentage x10 as weight points
		}
	}
	return out
}

func main() {
	var (
		csvPath = flag.String("csv", "", "path to the questions CSV")
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

	if _, err := r.Read(); err != nil { // header
		log.Fatal(err)
	}

	ctx := context.Background()
	var pool *pgxpool.Pool
	if !*dryRun {
		pool, err = db.Connect(ctx, *dbURL)
		if err != nil {
			log.Fatalf("db: %v", err)
		}
		defer pool.Close()

		// Load the programs mapping (compact name -> canonical name + setting).
		rows, err := pool.Query(ctx, `select name, institutional_setting from programs`)
		if err != nil {
			log.Fatalf("load programs: %v", err)
		}
		defer rows.Close()
		for rows.Next() {
			var name, setting string
			if err := rows.Scan(&name, &setting); err != nil {
				log.Fatal(err)
			}
			mapping[compact(name)] = name
		}
	}

	inserted, skippedProg := 0, map[string]int{}
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("read error: %v", err)
			break
		}
		rec = append(rec, "", "", "", "", "", "", "", "")[:8]
		for i := range rec {
			rec[i] = strings.TrimSpace(rec[i])
		}
		text, cat, variants, specialty, progStr, settingsStr, freq, year := rec[0], rec[1], rec[2], rec[3], rec[4], rec[5], rec[6], rec[7]
		if text == "" {
			continue
		}

		// variants: one per line
		var vs []string
		for _, v := range strings.Split(variants, "\n") {
			if v = strings.TrimSpace(v); v != "" {
				vs = append(vs, v)
			}
		}
		if vs == nil {
			vs = []string{}
		}

		// programs: split on commas, map to canonical names
		var progs []string
		for _, p := range strings.Split(progStr, ",") {
			p = strings.TrimSpace(p)
			if p == "" {
				continue
			}
			if strings.HasPrefix(strings.ToLower(p), "any connection") {
				p = strings.TrimSpace(p[len("any connection"):])
			}
			if p == "" {
				continue
			}
			ck := compact(p)
			if canon, ok := mapping[ck]; ok {
				progs = append(progs, canon)
			} else {
				skippedProg[p]++
			}
		}

		// settings weights
		weights := parseSettings(settingsStr)
		cb, ub, mil, cbua, other := weights["Community Based"], weights["University Based"], weights["Military Based"],
			weights["Community Based University Affiliated"], weights["Other"]
		if freq == "" {
			freq = "Sometimes"
		}
		yr := 0
		if year != "" {
			yr, _ = strconv.Atoi(year)
		}

		if *dryRun {
			log.Printf("[%s] %s | variants=%d programs=%d settings={%d,%d,%d,%d,%d}", cat, text[:min(40, len(text))], len(vs), len(progs), cb, ub, mil, cbua, other)
			inserted++
			continue
		}

		var prog *string
		if len(progs) > 0 {
			prog = &progs[0]
		}
		_, err = pool.Exec(ctx, `
			insert into questions
			  (text, variants, category, specialty, program, frequency, year, programs,
			   setting_community_based, setting_university_based, setting_military_based,
			   setting_cb_university_affiliated, setting_other)
			values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
			text, vs, cat, nullable(specialty), prog, nullable(freq), nullableInt(yr), progs,
			cb, ub, mil, cbua, other)
		if err != nil {
			log.Printf("insert error for %q: %v", text[:min(40, len(text))], err)
			continue
		}
		inserted++
	}

	log.Printf("done. inserted=%d", inserted)
	if len(skippedProg) > 0 {
		log.Printf("SKIPPED unmatched programs (not in mapping):")
		for p, n := range skippedProg {
			log.Printf("  %dx %s", n, p)
		}
	}
}

var mapping = map[string]string{}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullableInt(n int) any {
	if n == 0 {
		return nil
	}
	return n
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
