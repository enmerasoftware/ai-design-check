# @enmera/ai-design-check

[English](README.md)

Yapay zekâ kodlama ajanlarıyla (Claude Code, Cursor, Codex) yapılan arayüzleri tasarım kurallarına göre denetler;
böylece "yapay zekâ yapmış" gibi görünmez ve tek bir sisteme uyarlar. Ajan arayüzü yazmadan önce kuralları okur,
bağımlılıksız denetçi gözden kaçanı bulur, her kural nasıl düzeltileceğini söyler. Paneller, yönetim ekranları ve
SaaS ekranları için.

Kurallar [Enmera](https://enmera.com.tr) ve [Searvia](https://searvia.com)'da canlıya çıkmış gerçek ekranlardan
çıktı: "üretilmiş" gibi okunanlar, dar ekranda bozulanlar, kullanıcının anlamadıkları. Her kural **ne**, **neden** ve
**nasıl düzeltilir** sorularını Türkçe ve İngilizce yanıtlar.

```bash
npx @enmera/ai-design-check            # projeyi denetle (ya da: ai-design-check src lang)
npx @enmera/ai-design-check rules --tr # kuralları listele
npx @enmera/ai-design-check init       # varsayılan ayar dosyasını yaz
```

## Neleri kapsar

| Konu | Örnekler |
|---|---|
| Yazım | Arayüz metninde yalnız ilk kelime büyük (Türkçe ve İngilizce), süs amaçlı büyük harf yok, etiket yerine sığar |
| Yazı ve yüzey | Tek yazı ölçeği (`text-2xs` = 11 px taban), tek köşe ölçeği, kart içinde kart yok |
| Seçiciler | Ana seçim bölmeli seçici, alt sekmeler aynı satırda kutusuz, hap düğme yalnız süzgeçte |
| Yerleşim | Geniş tablo tam genişlikte, yüksekliği farklı kartlar ızgara tabanlı masonry'de, okunur satır uzunluğu, boşlukta ritim |
| Menü | İşe göre bölümler, özellikten önce yer ve adres kararı, taşınan adres yönlenir |
| Görsel dil | Emoji yerine çizgi ikon, gradyan metin ve mor gradyan yok, kenar çizgisi yok, parıltı yalnız grafikte |
| Hareket | Nabız yalnız canlı veride, kendiliğinden kayan şerit yok |
| Veri ve metin | Sayı neye göre olduğunu söyler, boş durum, pazarlama klişesi yok |

Gerekçeleriyle tam liste: [RULES.tr.md](RULES.tr.md).

## Denetçi

Bağımlılıksız Node (20+). `.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, Blade, CSS ve çeviri JSON dosyalarını okur;
kural kimliğini dosya ve satırla bildirir. Göz gerektiren kurallar (yerleşim, seçiciler, boş durum) *gözden
geçirilir* olarak işaretlidir; onlara insanlar ve ajanlar bakar.

Hata varsa çıkış kodu 1 (`--strict` ile uyarıda da), makineler için `--json`.

### Ayar

Proje kökünde `ai-design-check.json` (ya da nokta dosyası `.design-rules.json`). Örnek ve alanlar için
[README.md](README.md#configuration).

- `i18n.files`: çeviri sözlükleri. `keysAreSource` ile anahtarlar İngilizce kaynak metindir ve onlar da denetlenir;
  `framework` çerçevenin sahip olduğu, adı değiştirilemeyen anahtarlardır.
- `properNouns`: büyük harfini koruyan adlar.
- `allow`: kural başına `"glob"` ya da `"glob:birebir eşleşme"`.
- `rules`: kural kimliği başına `"off"`, `"info"`, `"warn"` ya da `"error"`.

## Yapay zekâ ajanları için

Paket, ajana arayüze dokunmadan önce kuralları okumasını ve sonra denetçiyi çalıştırmasını söyleyen bir beceriyle gelir:

```bash
npx skills add enmerasoftware/ai-design-check
```

## Kural eklemek

Kurallar [`rules.json`](rules.json) dosyasında: `id`, `area`, `severity`, `en` ve `tr` olarak `title` / `rule` /
`why` / `fix` ve isteğe bağlı `check` (`pattern`, `flags`, `files` ile `regex`). `npm run docs` RULES.md ve
RULES.tr.md dosyalarını yeniden üretir; çekme isteğinden önce `npm test`.

## Lisans

MIT
