package questions

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/gulam/interviewprep/backend/internal/auth"
	"github.com/gulam/interviewprep/backend/internal/respond"
	"github.com/jackc/pgx/v5"
)

const (
	MaxCommentsLen = 3000
	MaxRepliesLen  = 3000
)

// starExpr is the SQL for a question's average star rating.
// Referenced as s.star in queries that cross join lateral starExpr.
const starExpr = `
		coalesce(round(avg(r.star)::numeric, 1), 0) as star
	`

// encounterSettingsExpr aggregates a question's encounter-derived setting counts
// into a jsonb object like {"Community Based": 2}. References the outer alias q.
const encounterSettingsExpr = `
	coalesce((
		select jsonb_object_agg(x.setting, x.cnt)
		from (
			select p.institutional_setting as setting, count(*) as cnt
			from encounters e
			join programs p on p.id = e.program_id
			where e.question_id = q.id and e.encountered and e.program_id is not null
			group by p.institutional_setting
		) x
	), '{}'::jsonb)`

// SelectCols is the shared column list (without the trailing comment/encounter
// counts) for question selects. Must be used with a lateral `s` (star) and the
// q alias.
const SelectCols = `
		q.id, q.text, q.variants, q.category, q.specialty, q.program,
		q.institutional_setting, q.frequency, q.year, s.star, q.programs,
		q.created_by, q.created_at, q.updated_at,
		q.setting_community_based, q.setting_university_based, q.setting_military_based,
		q.setting_cb_university_affiliated, q.setting_other,
		` + encounterSettingsExpr + ` as encounter_settings,
		(select count(*) from comments c where c.question_id = q.id and c.parent_id is null) as comment_count,
		(select count(*) from encounters e where e.question_id = q.id and e.encountered) as encounter_count`

// scanQuestion scans a full question row produced by SelectCols.
func scanQuestion(scan func(dest ...any) error, item *Question) error {
	return scan(
		&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
		&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
		&item.Star, &item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
		&item.SettingCommunityBased, &item.SettingUniversityBased, &item.SettingMilitaryBased,
		&item.SettingCBUA, &item.SettingOther, &item.EncounterSettings,
		&item.CommentCount, &item.EncounterCount,
	)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	conds := []string{"1=1"}
	args := []any{}
	arg := func(v any) string {
		args = append(args, v)
		return "$" + strconv.Itoa(len(args))
	}

	if v := q.Get("category"); v != "" {
		conds = append(conds, "q.category = "+arg(v))
	}
	if v := q.Get("specialty"); v != "" {
		conds = append(conds, "q.specialty = "+arg(v))
	}
	if v := q.Get("program"); v != "" {
		conds = append(conds, "(q.program = "+arg(v)+" or "+arg(v)+" = any(q.programs))")
	}

	// Institutional setting filter: matches questions with ANY share of the
	// setting (>0%). A min_percent narrows it to questions whose share of that
	// setting is at least min_percent.
	setting := q.Get("institutional_setting")
	if setting != "" {
		col := settingColumn(setting)
		if col != "" {
			minPct := 0
			if v := q.Get("min_percent"); v != "" {
				if n, err := strconv.Atoi(v); err == nil {
					minPct = n
				}
			}
			conds = append(conds, settingFilterSQL(setting, col, minPct))
		}
	}

	if v := q.Get("frequency"); v != "" {
		conds = append(conds, "q.frequency = "+arg(v))
	}
	if v := q.Get("min_star"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			conds = append(conds, "s.star >= "+arg(n))
		}
	}

	order := "q.created_at desc"
	switch q.Get("sort") {
	case "star":
		order = "s.star desc, q.created_at desc"
	case "frequency":
		order = "case q.frequency when 'Most' then 3 when 'Sometimes' then 2 when 'Rare' then 1 else 0 end desc, q.created_at desc"
	case "oldest":
		order = "q.created_at asc"
	default:
		order = "q.created_at desc"
	}

	limit := 50
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	offset := 0
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	where := strings.Join(conds, " and ")
	sql := `
		select ` + SelectCols + `
		from questions q
		cross join lateral (
		  select ` + starExpr + `
		  from ratings r where r.question_id = q.id
		) s
		where ` + where + `
		order by ` + order + `
		limit ` + arg(limit) + ` offset ` + arg(offset)

	rows, err := h.pool.Query(r.Context(), sql, args...)
	if err != nil {
		log.Printf("list questions error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not list questions")
		return
	}
	defer rows.Close()

	items := []Question{}
	for rows.Next() {
		var item Question
		if err := scanQuestion(rows.Scan, &item); err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not scan questions")
			return
		}
		item.Settings = ComputeSettings(Weights(item), item.EncounterSettings)
		items = append(items, item)
	}

	// Attach per-user fields when authenticated.
	if u := auth.UserFrom(r); u != nil {
		h.attachUserState(r, u.ID, items)
	}

	respond.JSON(w, http.StatusOK, items)
}

// weights returns the base setting weights as a map keyed by setting name.
func Weights(q Question) map[string]int {
	return map[string]int{
		"Community Based":                       q.SettingCommunityBased,
		"University Based":                      q.SettingUniversityBased,
		"Military Based":                        q.SettingMilitaryBased,
		"Community Based University Affiliated": q.SettingCBUA,
		"Other":                                 q.SettingOther,
	}
}

// settingFilterSQL builds the WHERE condition for a setting + min percent.
// num/denom mirror computeSettings so filters match displayed percentages.
func settingFilterSQL(setting, col string, minPct int) string {
	if minPct <= 0 {
		// any share (> 0): base weight present OR any encounter at this setting.
		return "(" + col + " > 0 or exists(" +
			"select 1 from encounters e join programs p on p.id = e.program_id " +
			"where e.question_id = q.id and e.encountered and p.institutional_setting = '" + setting + "') )"
	}
	encAt := `(select count(*) from encounters e join programs p on p.id = e.program_id
	            where e.question_id = q.id and e.encountered and p.institutional_setting = '` + setting + `')`
	totalEnc := `(select count(*) from encounters e2 join programs p2 on p2.id = e2.program_id
	              where e2.question_id = q.id and e2.encountered)`
	totalBase := `(q.setting_community_based + q.setting_university_based + q.setting_military_based
	              + q.setting_cb_university_affiliated + q.setting_other)`

	num := "(" + col + " + coalesce(" + encAt + ", 0))"
	den := "(" + totalBase + " + coalesce(" + totalEnc + ", 0))"
	return "(" + num + " * 100.0 / nullif(" + den + ", 0) >= " + strconv.Itoa(minPct) + ")"
}

// attachUserState fills my_rating, my_encounters and saved for the current user.
func (h *Handler) attachUserState(r *http.Request, userID uuid.UUID, items []Question) {
	for i := range items {
		var myRating int
		err := h.pool.QueryRow(r.Context(), `
			select star from ratings where question_id = $1 and user_id = $2`,
			items[i].ID, userID,
		).Scan(&myRating)
		if err == nil {
			items[i].MyRating = &myRating
		}

		rows, err := h.pool.Query(r.Context(), `
			select coalesce(program_name, '') from encounters
			where question_id = $1 and user_id = $2
			order by created_at asc`, items[i].ID, userID)
		if err == nil {
			names := []string{}
			for rows.Next() {
				var n string
				if err := rows.Scan(&n); err == nil && n != "" {
					names = append(names, n)
				}
			}
			rows.Close()
			items[i].MyEncounters = names
		}

		err = h.pool.QueryRow(r.Context(), `
			select exists(select 1 from saved_questions where question_id = $1 and user_id = $2)`,
			items[i].ID, userID,
		).Scan(&items[i].Saved)
		if err != nil {
			items[i].Saved = false
		}
	}
}

type questionInput struct {
	Text                 string         `json:"text"`
	Variants             []string       `json:"variants"`
	Category             string         `json:"category"`
	Specialty            *string        `json:"specialty"`
	Program              *string        `json:"program"`
	Programs             []string       `json:"programs"`
	InstitutionalSetting *string        `json:"institutional_setting"`
	Frequency            *string        `json:"frequency"`
	Year                 *int           `json:"year"`
	Settings             *SettingsInput `json:"settings"`
}

type SettingsInput struct {
	Type    string         `json:"type"` // "direct" | "percentage"
	Setting string         `json:"setting"`
	Values  map[string]int `json:"values"`
}

// resolveSettings turns the settings input (direct or percentage) into weights.
// Falls back to the legacy single institutional_setting. Returns the weights and
// the direct setting to store on institutional_setting for backward compat.
func resolveSettings(s *SettingsInput, legacy *string) (map[string]int, *string) {
	w := map[string]int{}
	var direct *string
	if s != nil {
		switch s.Type {
		case "direct":
			if settingColumn(s.Setting) != "" {
				w[s.Setting] = 1
				v := s.Setting
				direct = &v
			}
		case "percentage":
			for k, v := range s.Values {
				if settingColumn(k) != "" && v > 0 {
					w[k] = v
				}
			}
		}
	}
	if len(w) == 0 && legacy != nil && settingColumn(*legacy) != "" {
		w[*legacy] = 1
		direct = legacy
	}
	return w, direct
}

// weightsFromMap converts a setting->weight map into the five scalar weights.
func containsString(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

func weightsFromMap(w map[string]int) (cb, ub, mil, cbua, other int) {
	return w["Community Based"], w["University Based"], w["Military Based"],
		w["Community Based University Affiliated"], w["Other"]
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	var in questionInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.Text = strings.TrimSpace(in.Text)
	if in.Text == "" {
		respond.Error(w, http.StatusBadRequest, "question text is required")
		return
	}
	if in.Category == "" {
		in.Category = "About You"
	}
	if in.Variants == nil {
		in.Variants = []string{}
	}

	// Normalize programs: multi-select array, or legacy single program.
	progNames := []string{}
	for _, p := range in.Programs {
		p = strings.TrimSpace(p)
		if p != "" && !containsString(progNames, p) {
			progNames = append(progNames, p)
		}
	}
	if len(progNames) == 0 && in.Program != nil && strings.TrimSpace(*in.Program) != "" {
		progNames = []string{strings.TrimSpace(*in.Program)}
	}
	if len(progNames) > 0 {
		in.Program = &progNames[0]
	}

	weights, direct := resolveSettings(in.Settings, in.InstitutionalSetting)
	if in.InstitutionalSetting == nil {
		in.InstitutionalSetting = direct
	}
	cb, ub, mil, cbua, other := weightsFromMap(weights)

	var item Question
	err := h.pool.QueryRow(r.Context(), `
		insert into questions (text, variants, category, specialty, program, institutional_setting, frequency, year, created_by,
			setting_community_based, setting_university_based, setting_military_based, setting_cb_university_affiliated, setting_other,
			programs)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		returning id, text, variants, category, specialty, program, institutional_setting, frequency, year, programs, created_by, created_at, updated_at`,
		in.Text, in.Variants, in.Category, in.Specialty, in.Program, in.InstitutionalSetting,
		in.Frequency, in.Year, u.ID, cb, ub, mil, cbua, other, progNames,
	).Scan(&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
		&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
		&item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		log.Printf("create question error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not create question")
		return
	}
	item.Settings = ComputeSettings(weights, map[string]int{})
	respond.JSON(w, http.StatusCreated, item)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}

	var item Question
	err = h.pool.QueryRow(r.Context(), `
		select `+SelectCols+`
		from questions q
		cross join lateral (
		  select `+starExpr+`
		  from ratings r where r.question_id = q.id
		) s
		where q.id = $1`, id,
	).Scan(&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
		&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
		&item.Star, &item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
		&item.SettingCommunityBased, &item.SettingUniversityBased, &item.SettingMilitaryBased,
		&item.SettingCBUA, &item.SettingOther, &item.EncounterSettings,
		&item.CommentCount, &item.EncounterCount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "question not found")
			return
		}
		log.Printf("get question scan error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not load question")
		return
	}
	item.Settings = ComputeSettings(Weights(item), item.EncounterSettings)

	list := []Question{item}
	if u := auth.UserFrom(r); u != nil {
		h.attachUserState(r, u.ID, list)
		item = list[0]
	}

	comments, err := h.loadComments(r, id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load comments")
		return
	}

	encounters, err := h.encounterSummary(r, id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load encounters")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"question":   item,
		"comments":   comments,
		"encounters": encounters,
	})
}

// encounterSummary aggregates "I encountered" reports by program name.
func (h *Handler) encounterSummary(r *http.Request, questionID uuid.UUID) ([]EncounterSummary, error) {
	rows, err := h.pool.Query(r.Context(), `
		select coalesce(nullif(program_name, ''), 'unspecified') as p, count(*) as n
		from encounters
		where question_id = $1 and encountered
		group by p
		order by n desc, p asc`, questionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []EncounterSummary{}
	for rows.Next() {
		var e EncounterSummary
		if err := rows.Scan(&e.ProgramName, &e.Count); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, nil
}

type EncounterSummary struct {
	ProgramName string `json:"program_name"`
	Count       int    `json:"count"`
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	var in questionInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	tag, err := h.pool.Exec(r.Context(), `
		update questions set
		  text = coalesce(nullif($1, ''), text),
		  variants = $2,
		  category = coalesce(nullif($3, ''), category),
		  specialty = $4, program = $5, institutional_setting = coalesce($6, institutional_setting),
		  frequency = $7, year = $8,
		  updated_at = now()
		where id = $9`,
		in.Text, in.Variants, in.Category, in.Specialty, in.Program, in.InstitutionalSetting,
		in.Frequency, in.Year, id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not update question")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "question not found")
		return
	}

	item, err := h.fetchQuestion(r.Context(), id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load question")
		return
	}
	list := []Question{item}
	if u := auth.UserFrom(r); u != nil {
		h.attachUserState(r, u.ID, list)
		item = list[0]
	} else {
		item.Star = 0
	}
	respond.JSON(w, http.StatusOK, item)
}

// Rate upserts the current user's star rating and returns the new average.
func (h *Handler) Rate(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	var in struct {
		Star int `json:"star"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if in.Star < 0 || in.Star > 5 {
		respond.Error(w, http.StatusBadRequest, "star must be between 0 and 5")
		return
	}

	if in.Star == 0 {
		// Unrate: delete the user's rating row
		_, err = h.pool.Exec(r.Context(), `
			delete from ratings where question_id = $1 and user_id = $2`,
			id, u.ID)
		if err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not remove rating")
			return
		}
	} else {
		_, err = h.pool.Exec(r.Context(), `
			insert into ratings (question_id, user_id, star)
			values ($1, $2, $3)
			on conflict (question_id, user_id)
			do update set star = excluded.star, updated_at = now()`,
			id, u.ID, in.Star)
		if err != nil {
			respond.Error(w, http.StatusInternalServerError, "could not save rating")
			return
		}
	}

	var avg float64
	if err := h.pool.QueryRow(r.Context(), `
		select coalesce(round(avg(star)::numeric, 1), 0) from ratings where question_id = $1`,
		id,
	).Scan(&avg); err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load rating")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"star":      avg,
		"my_rating": in.Star,
	})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	tag, err := h.pool.Exec(r.Context(),
		`delete from questions where id = $1 and created_by = $2`, id, u.ID)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not delete question")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "question not found or not yours")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"message": "deleted"})
}

// AddVariant lets any signed-in user append a variant to a question.
func (h *Handler) AddVariant(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	var in struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	in.Text = strings.TrimSpace(in.Text)
	if in.Text == "" {
		respond.Error(w, http.StatusBadRequest, "variant text is required")
		return
	}

	_, err = h.pool.Exec(r.Context(), `
		update questions
		set variants = case when $2 = any(variants) then variants else array_append(variants, $2) end,
		    updated_at = now()
		where id = $1`, id, in.Text)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "question not found")
			return
		}
		log.Printf("add variant error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not add variant")
		return
	}

	item, err := h.fetchQuestion(r.Context(), id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load question")
		return
	}
	if u := auth.UserFrom(r); u != nil {
		list := []Question{item}
		h.attachUserState(r, u.ID, list)
		item = list[0]
	}
	respond.JSON(w, http.StatusOK, item)
}

// DeleteVariant lets any signed-in user remove a variant by its index.
func (h *Handler) DeleteVariant(w http.ResponseWriter, r *http.Request) {
	u := auth.UserFrom(r)
	if u == nil {
		respond.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "invalid question id")
		return
	}
	idx, err := strconv.Atoi(r.PathValue("index"))
	if err != nil || idx < 0 {
		respond.Error(w, http.StatusBadRequest, "invalid variant index")
		return
	}

	var variants []string
	err = h.pool.QueryRow(r.Context(),
		`select variants from questions where id = $1`, id).Scan(&variants)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respond.Error(w, http.StatusNotFound, "question not found")
			return
		}
		log.Printf("delete variant load error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not delete variant")
		return
	}
	if idx >= len(variants) {
		respond.Error(w, http.StatusBadRequest, "invalid variant index")
		return
	}
	variants = append(variants[:idx], variants[idx+1:]...)
	if variants == nil {
		variants = []string{}
	}

	_, err = h.pool.Exec(r.Context(),
		`update questions set variants = $1, updated_at = now() where id = $2`, variants, id)
	if err != nil {
		log.Printf("delete variant error: %v", err)
		respond.Error(w, http.StatusInternalServerError, "could not delete variant")
		return
	}

	item, err := h.fetchQuestion(r.Context(), id)
	if err != nil {
		respond.Error(w, http.StatusInternalServerError, "could not load question")
		return
	}
	if u := auth.UserFrom(r); u != nil {
		list := []Question{item}
		h.attachUserState(r, u.ID, list)
		item = list[0]
	}
	respond.JSON(w, http.StatusOK, item)
}

// fetchQuestion loads a single question with its average star rating.
func (h *Handler) fetchQuestion(ctx context.Context, id uuid.UUID) (Question, error) {
	var item Question
	err := h.pool.QueryRow(ctx, `
		select `+SelectCols+`
		from questions q
		cross join lateral (
		  select `+starExpr+`
		  from ratings r where r.question_id = q.id
		) s
		where q.id = $1`, id,
	).Scan(&item.ID, &item.Text, &item.Variants, &item.Category, &item.Specialty,
		&item.Program, &item.InstitutionalSetting, &item.Frequency, &item.Year,
		&item.Star, &item.Programs, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt,
		&item.SettingCommunityBased, &item.SettingUniversityBased, &item.SettingMilitaryBased,
		&item.SettingCBUA, &item.SettingOther, &item.EncounterSettings,
		&item.CommentCount, &item.EncounterCount)
	if err == nil {
		item.Settings = ComputeSettings(Weights(item), item.EncounterSettings)
	}
	return item, err
}
