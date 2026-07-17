// The ~20 words dealt into a day-one Deck so the Tower isn't a locked door
// (ADR 0023). Every reading comes from the dictionary; every word has a
// bundled sprite — StarterPackTests holds both.
enum StarterPack {
    struct Word {
        let english: String
        let traditional: String
        let jyutping: String
    }

    static let words: [Word] = [
        Word(english: "eat", traditional: "食", jyutping: "sik6"),
        Word(english: "drink", traditional: "飲", jyutping: "jam2"),
        Word(english: "bread", traditional: "麪包", jyutping: "min6 baau1"),
        Word(english: "milk", traditional: "奶", jyutping: "naai5"),
        Word(english: "tea", traditional: "茶", jyutping: "caa4"),
        Word(english: "apple", traditional: "蘋果", jyutping: "ping4 gwo2"),
        Word(english: "banana", traditional: "香蕉", jyutping: "hoeng1 ziu1"),
        Word(english: "dog", traditional: "狗", jyutping: "gau2"),
        Word(english: "cat", traditional: "貓", jyutping: "maau1"),
        Word(english: "horse", traditional: "馬", jyutping: "maa5"),
        Word(english: "pig", traditional: "豬", jyutping: "zyu1"),
        Word(english: "cow", traditional: "牛", jyutping: "ngau4"),
        Word(english: "bird", traditional: "雀仔", jyutping: "zoek3 zai2"),
        Word(english: "house", traditional: "屋", jyutping: "uk1"),
        Word(english: "bed", traditional: "牀", jyutping: "cong4"),
        Word(english: "book", traditional: "書", jyutping: "syu1"),
        Word(english: "shoe", traditional: "鞋", jyutping: "haai4"),
        Word(english: "hat", traditional: "帽", jyutping: "mou2"),
        Word(english: "rain", traditional: "雨", jyutping: "jyu5"),
        Word(english: "star", traditional: "星", jyutping: "sing1"),
    ]
}
