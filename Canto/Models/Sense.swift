import GRDB

struct Sense: Identifiable, Hashable, FetchableRecord {
    let id: Int64
    let traditional: String
    let simplified: String?
    let jyutping: String
    let pinyin: String?
    let gloss: String
    let source: Int
    let popularity: Int

    init(row: Row) {
        id = row["id"]
        traditional = row["traditional"]
        simplified = row["simplified"]
        jyutping = row["jyutping"]
        pinyin = row["pinyin"]
        gloss = row["gloss"]
        source = row["source"]
        popularity = row["popularity"]
    }
}
