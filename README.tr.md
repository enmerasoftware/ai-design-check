# @enmera/ai-design-check

[English](README.md)

![Yapay zekâ ile yapılmış bir panel: denetlendi, düzeltildi, yeniden denetlendi; 266 bulgudan 0'a](examples/story-dashboard.webp)

Yapay zekâ kodlama ajanlarıyla (Claude Code, Cursor, Codex) yapılan arayüzleri "yapay zekâ yapmış" gibi gösteren
şeyleri bulur ve düzeltir: 74 tasarım kuralı, her bulguyu işaretleyen bağımlılıksız bir denetçi ve ekranı düzeltip
yeniden denetleyerek kanıtlayan bir ajan becerisi. Paneller, yönetim ekranları, SaaS ekranları ve tanıtım sayfaları için.

```bash
npx @enmera/ai-design-check                    # projeyi denetle (ya da: ai-design-check src lang)
npx skills add enmerasoftware/ai-design-check  # kurallar ve düzelten beceri, ajanınız için
```

Sonra ajanınıza "bu ekranın tasarımını düzelt" deyin. Ölçer, ürününüzden bir yön önerir; boşluk, renk, ikon, metin,
yazı, yerleşim, bileşen ve hareketi katman katman düzeltir ve önce/sonra bulgu sayısını gösterir. Denetçi, bir sonraki
ajan düzenlemesinin aynı kusurları geri getirmesini de engeller.

Kurallar [Enmera](https://enmera.com.tr) ve [Searvia](https://searvia.com)'da canlıya çıkmış gerçek ekranlardan
çıktı: "üretilmiş" gibi okunanlar, dar ekranda bozulanlar, kullanıcının anlamadıkları. Her kural **ne**, **neden** ve
**nasıl düzeltilir** sorularını Türkçe ve İngilizce yanıtlar. Ardından Dribbble ve Behance'teki 16 yüksek puanlı panel
tasarımıyla karşılaştırıldı: en güçlü işlerin ortak örüntüleri kural oldu (gösterge kartı düzeni, tek kart başlığı,
grafikte tek vurgulu seri, düz düğme, gölge yerine yüzey basamağı); popüler işlerin kendisinde görülen izlerde (yarısı
"Tekrar hoş geldin 👋" ile açılıyor) kural korundu. Yöntem ve bulgular: [RESEARCH.md](RESEARCH.md).

```bash
npx @enmera/ai-design-check            # projeyi denetle (ya da: ai-design-check src lang)
npx @enmera/ai-design-check inventory  # kaç farklı düğme, form öğesi, başlık, rozet, kutu var
npx @enmera/ai-design-check rules --tr # kuralları listele
npx @enmera/ai-design-check init       # varsayılan ayar dosyasını yaz
npx @enmera/ai-design-check story once.html sonra.html  # yukarıdaki gibi kare önce/sonra videosu
```

Yapay zekâ yok, API anahtarı yok, bağımlılık yok: ölçülebilir kusurları yakalar (yerine bir şey konmadan kaldırılmış
odak halkası, adsız ikon düğmesi, ölçek dışı yazı boyutu, 4 px ızgarası dışında boşluk, ortak `Button`un yanında ham `<button>`, ikon yerine
emoji, "Tekrar hoş geldin, Ali!", Türkçeyi bozan `toUpperCase()`); zevki size ve düzelten beceriye bırakır.

## Neleri kapsar

| Konu | Örnekler |
|---|---|
| Yazım | Arayüz metninde yalnız ilk kelime büyük (Türkçe ve İngilizce), süs amaçlı büyük harf yok, etiket yerine sığar |
| Yazı ve yüzey | Tek yazı ölçeği (`text-2xs` = 11 px taban), tek köşe ölçeği, kart içinde kart yok |
| Bileşenler | Düğme, form öğesi ve seçim kutusu ortak bileşenden; onlara dışarıdan görünüm verilmez; tekrarlanan kalıp bileşen olur |
| Erişilebilirlik | Odak halkası yerine yenisi konmadan kaldırılmaz, yalnız ikonlu düğmenin adı vardır |
| Yerelleştirme | Dili belirten büyük-küçük harf dönüşümü (Türkçe i/İ), dil biçimleyicisinden sayı, gerçek çoğul, yapıştırılmış cümle yok |
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

Hata varsa çıkış kodu 1 (`--strict` ile uyarıda da); makineler için `--json`, çekme isteği açıklamaları için
`--format github`. Sınıf kuralları yalnız sınıf dizelerini okur (`class`, `className`, `cn()`, `clsx()`, `cva()`,
`twMerge()`); yorum ve metin eşleşmez.

`inventory` her öğe türünün kaç farklı biçimde yazıldığını sayar (yerleşim sınıfları sayılmaz); temizlikten önce
kaymayı, sonra kayboluşunu gösterir. Var olan projede `--write-baseline` bugünkü bulguları kaydeder, sonra yalnız
yeniler bildirilir. Tek bir yeri gerekçesiyle göz ardı etmek için:
`// ai-design-check-ignore-next-line kural-id -- neden` (gerekçesiz göz ardı geçerli sayılmaz).

### Ayar

Proje kökünde `ai-design-check.json` (ya da nokta dosyası `.design-rules.json`). Örnek ve alanlar için
[README.md](README.md#configuration).

- `i18n.files`: çeviri sözlükleri. `keysAreSource` ile anahtarlar İngilizce kaynak metindir ve onlar da denetlenir;
  `framework` çerçevenin sahip olduğu, adı değiştirilemeyen anahtarlardır.
- `properNouns`: büyük harfini koruyan adlar.
- `allow`: kural başına `"glob"` ya da `"glob:birebir eşleşme"`.
- `rules`: kural kimliği başına `"off"`, `"info"`, `"warn"` ya da `"error"`.
- `componentDirs`: ham öğelerin serbest olduğu yer (bileşenlerin kendisi). `sharedComponents`: görünümü prop'tan gelen
  bileşenler; `className` onları yalnız yerleştirir.
- `looks`: `use-shared-looks` kuralının bulduğu her elle yazılmış görünümün sahibi bileşen (rozet gibi span, kart gibi
  div, boyut sınıflı başlık, düğme gibi bağlantı). `false` o türü kapatır.

## Yapay zekâ ajanları için

Paket iki beceriyle gelir:

- **ai-design-check**: ajana arayüze dokunmadan önce kuralları okumasını, sonra denetçiyi çalıştırmasını söyler.
- **ai-design-fix**: üretilmiş gibi görünen bir ekranı düzeltir: ölçer, üründen yön seçer (kim, dünya, tek vurgu rengi,
  tek öne çıkan an), tüm ekranda katman katman düzeltir, yeniden denetleyip önce → sonra sayısını verir. Özellik, veri
  ve içerik korunur; bulgu gerekçesiz susturulmaz.

```bash
npx skills add enmerasoftware/ai-design-check
```

Ajanın her düzenlemeden hemen sonra bulguları görmesi için kanca: Claude Code'da `.claude/settings.json` içine
`PostToolUse` kancası olarak `npx -y @enmera/ai-design-check hook` (örnek [README.md](README.md#for-ai-coding-agents)).
Kanca yalnız düzenlenen dosyayı denetler; bulgu varsa çıkış kodu 2 ile ajana geri verir.

### Telefon ve uzun diller: `narrow`

`npx @enmera/ai-design-check narrow sayfa.html --width 320` sayfayı Chrome'da telefon ve masaüstü genişliğinde çizer;
yalnız çizilmiş sayfada görülenleri bildirir: yana kayan sayfa (ve onu iten öğeler), kesilen metin, sığsın diye
küçültülen yazı, masaüstünde olup telefonda gizlenen içerik. En uzun dilinizle çalıştırın; Almanca etiketler çoğu
zaman İngilizceden %30–40 uzundur. [examples/narrow-de.html](examples/narrow-de.html) 320 px'te dördünü de bozar,
[examples/narrow-de.fixed.html](examples/narrow-de.fixed.html) içerik gizlemeden ve yazı küçültmeden düzeltir.

### Önce/sonra videosu: `story`

`npx @enmera/ai-design-check story once.html sonra.html --out story.mp4 --music parca.mp3` paylaşmak için 12 saniyelik kare bir video
üretir: önceki ekranda her bulgu tek tek işaretlenir, sayı düşerken sonraki ekrana geçilir, sonda özet kartı; `--music` verilen parçayı videonun süresine kesip sonunda kısar. Dosya ya
da adres alır; kurulu Chrome'u DevTools protokolüyle sürer ve ffmpeg ile kodlar, npm'den bir şey kurulmaz.

## Kural eklemek

Kurallar [`rules.json`](rules.json) dosyasında: `id`, `area`, `severity`, `en` ve `tr` olarak `title` / `rule` /
`why` / `fix` ve isteğe bağlı `check` (`pattern`, `flags`, `files` ile `regex`). `npm run docs` RULES.md ve
RULES.tr.md dosyalarını yeniden üretir; çekme isteğinden önce `npm test`.

İlham kaynakları arasında [Impeccable](https://github.com/pbakaus/impeccable), Damir Sokolovsky'nin
[unslop](https://github.com/heydamir/unslop) becerisi ve Anthropic'in frontend-design becerisi var.

## Lisans

MIT
