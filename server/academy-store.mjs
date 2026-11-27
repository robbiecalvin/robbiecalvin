import { readFile } from "node:fs/promises";

export function localAcademy(db, bundlePath) {
  db.exec(`CREATE TABLE IF NOT EXISTS academy_c01 (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
    state TEXT NOT NULL CHECK(json_valid(state)),
    certificate_id TEXT GENERATED ALWAYS AS (json_extract(state, '$.certificate.id')) STORED UNIQUE
  )`);
  const decode = (row) => row && { ...row, state: JSON.parse(row.state) };
  const store = {
    get: (id) => decode(db.prepare("SELECT * FROM academy_c01 WHERE user_id = ?").get(id)),
    insert: (id, state) => db.prepare("INSERT OR IGNORE INTO academy_c01 (user_id,state) VALUES (?,?)").run(id, JSON.stringify(state)),
    update: (id, revision, state) => db.prepare("UPDATE academy_c01 SET state=?, revision=revision+1 WHERE user_id=? AND revision=?")
      .run(JSON.stringify(state), id, revision).changes === 1,
    findCertificate: (id) => decode(db.prepare("SELECT state FROM academy_c01 WHERE certificate_id=?").get(id))?.state.certificate,
    list: () => db.prepare("SELECT user_id,state FROM academy_c01 WHERE json_array_length(state,'$.capstones')>0 AND json_type(state,'$.capstones[#-1].review') IS NULL ORDER BY user_id LIMIT 100").all().map(decode),
  };
  const loadBundle = async () => {
    try { return JSON.parse(await readFile(bundlePath, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; return null; }
  };
  return { store, loadBundle };
}
