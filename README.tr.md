# ai-design-check

**Yapay zekâ ile yapılmış arayüzü "üretilmiş" gösteren şeyleri bulur, düzeltir ve geri gelmesini engeller.**

[![npm sürümü](https://img.shields.io/npm/v/@enmera/ai-design-check)](https://www.npmjs.com/package/@enmera/ai-design-check)
[![lisans: MIT](https://img.shields.io/npm/l/@enmera/ai-design-check)](LICENSE)
[English](README.md) · [日本語](README.ja.md)

Claude Code, Cursor ya da Codex ile geliştirenler için: 141 tasarım kuralı, bağımlılık ve API anahtarı gerektirmeyen bir
denetçi ve ekranı onaran bir ajan becerisi. Web projelerini (React, Vue, Svelte, Laravel Blade, HTML; Tailwind, Bootstrap ya da düz CSS)
ve SwiftUI, Jetpack Compose, Flutter, React Native uygulamalarını okur. Bulmak için ajan gerekmez, mekanik düzeltmeler için de gerekmez.

## Üç adımda başlayın

**1. Projenizi denetleyin.**

```bash
npx @enmera/ai-design-check
```

```
Accessibility (1)
src/pages/dashboard.tsx
     31  error  Never remove the focus ring without a replacement: outline-none  focus-ring-removed

Style (3)
src/pages/dashboard.tsx
     42  error  Font sizes from the scale only: text-[10px]  type-scale
     88  warn   No tracked uppercase labels: tracking-wide uppercase  no-decorative-uppercase

lang/tr.json
    812  error  Translation in Title Case: "Sıra Takibi" (Rank tracking)  sentence-case

1 accessibility, 3 style: 3 errors, 1 warnings, 0 notes.
```

**2. Tek cevabı olanı ajansız düzeltin.**

```bash
npx @enmera/ai-design-check --fix --dry-run
```

Bu komut değişiklikleri listeler; yazmak için `--dry-run` bayrağını kaldırın. Boşluk ve köşeler ölçeğinizin en yakın
basamağına gider, çok kalın yazı kalına iner. Dokunma alanı, renk, emoji, metin ve hiyerarşi karar istediği için raporda kalır.
`text-[Npx]` boyutlarının da temadaki en yakın boyuta gitmesi için `--nearest-type` ekleyin (`lg:text-[64px]` → `lg:text-6xl`).

**3. Kalanı ajanınıza bırakın.**

```bash
npx skills add enmerasoftware/ai-design-check
```

Sonra şunu yazın: *"bu ekranın tasarımını düzelt"*. Ajan ekranı ölçer, ürününüzden kısa bir özet çıkarır, ekranı onarır ve önce
ile sonraki sayıları gösterir. Özellikler, veriler ve metinler yerinde kalır.

<p align="center">
  <img src="examples/before-after-web.webp" width="860" alt="Aynı panel önce ve sonra: 266 bulgudan 0'a">
</p>
<p align="center"><sub>Aynı panel, önce ve sonra. <a href="examples/dashboard.html">Önceki</a> ve <a href="examples/dashboard.fixed.html">sonraki</a> hali açın ya da <a href="examples/story-dashboard.mp4">videoyu</a> izleyin.</sub></p>

## Pakette neler var

| Araç | Yanıtladığı soru | Çalıştırma |
|---|---|---|
| **Denetçi** | Sorun ne, hangi dosyada, hangi satırda? | `npx @enmera/ai-design-check` |
| **Düzelten beceri** | Ajan bu ekranı onarıp kanıtlayabilir mi? | `npx skills add enmerasoftware/ai-design-check` |
| **`scan`** | Çalışan sayfa gerçekte ne gösteriyor? Kontrast, boyut, neyin neyi kapattığı, betik hataları | `npx @enmera/ai-design-check scan http://localhost:3000` |
| **`redesign`** | Ajanım bu sayfayı inceleyip her adımı kanıtlayarak bir dalda yeniden yapabilir mi? | `npx @enmera/ai-design-check redesign http://localhost:3000` |
| **`inventory`** | Kaç farklı düğme, form öğesi, başlık ve kart var? | `npx @enmera/ai-design-check inventory` |
| **`narrow`** | Telefonda ya da uzun bir dilde ne bozuluyor? | `npx @enmera/ai-design-check narrow sayfa.html` |
| **`system`** | Yeni bir ürün hangi yazı tipi, ölçek ve renklerle başlamalı? | `npx @enmera/ai-design-check system --brand "#1E5A63"` |
| **`story`** | Değişikliği video olarak paylaşabilir miyim? | `npx @enmera/ai-design-check story once.html sonra.html` |

## Neleri yakalar

68 kural kodunuzu (34 tanesi uygulama kodunu da), 61 kural çalışan sayfayı (`scan`) okur, bir kısmı ikisini de. Kalan 33 kural ekrana bakmayı gerektirir; *gözden geçirilecek* olarak işaretlenir ve size ve
düzelten beceriye bırakılır. Her kural ne yapılacağını, nedenini ve nasıl düzeltileceğini Türkçe ve İngilizce anlatır:
[RULES.tr.md](RULES.tr.md).

| Alan | Örnekler |
|---|---|
| Erişilebilirlik | Odak halkası yerine başkası konmadan kaldırılmaz, yalnız ikonlu düğmenin adı olur, dokunma alanları |
| Telefon tarayıcıları | İki parmakla yakınlaştırma açık kalır, alanlarda 16 px yazı, sabit `100vh` yanında `dvh`, üzerine gelmeden görünmeyen içerik yok |
| Yazı ve biçim | En küçüğü 11 px olan tek yazı ölçeği, düzey başına tek köşe, kart içinde kart yok |
| Yazım ve metin | Yalnız ilk kelime büyük, aralıklı büyük harfli etiket yok, boş söz yok, ne yaptığını söyleyen düğme, ne yapılacağını söyleyen hata |
| Bileşenler | Düğme ve form öğeleri ortak bileşenden, dışarıdan biçim yok, tekrarlanan kod bileşene dönüşür |
| Yerleşim | Projenin ölçeğinde (okunamazsa 4 px) düzey başına tek boşluk, geniş tablolar sayfayı kaplar, telefonda her hücreye yer |
| Görsel dil | Emoji yerine çizgi ikon, gradyan yazı ve mor gradyan yok, yan şerit yok, renkli gölge yok, parıltı yalnız grafikte |
| Hareket | `transition-all` yok, sıçrama yok, hareket azaltma ayarına uyum, nabız yalnız canlı veride, yanıt 300 ms içinde, sonsuz döngü yok |
| Veri | Sayı neyle kıyaslandığını söyler, sabit genişlikte rakamlar, boş durumlar |
| Yerelleştirme | Dile uygun büyük/küçük harf (Türkçe i/İ), biçimlendirici ile sayılar, gerçek çoğul kuralları |
| Seçici ve menü | Tek seçici dili, işe göre gruplanmış menü, taşınan adres yönlendirilir |

Kurallar [Enmera](https://enmera.com.tr) ve [Searvia](https://searvia.com)'da canlıya çıkardığımız ekranlardan çıktı: üretilmiş
gibi görünenler, dar ekranda bozulanlar, kullanıcının anlamadıkları. Ardından yüksek puanlı 16 panel tasarımıyla karşılaştırdık.
Yöntem ve bulgular: [RESEARCH.md](RESEARCH.md).

**Ne kadar iyi ayırıyor?** [BENCHMARK.md](BENCHMARK.md) her kuralı, dört Claude ve iki GPT modelinin Tailwind ve Bootstrap ile
ürettiği 72 sayfada ve insanların tasarladığı 34 sitede çalıştırır. Bazı kurallar iki grubu açıkça ayırır: krem zemin yapay
zekâ sayfalarının %40'ında, sitelerin %3'ünde görülür; telefonda yapay zekâ sayfalarının %35'i yana kayar, insan
sitelerinin hiçbiri kaymaz. GPT ile Claude farklı izler bırakır: GPT her sayfada küçük yazı kullanır, sayfaların %88'inde
başlıkların harf aralığını sıkıştırır. Mor gradyan gibi bazıları artık ayırmıyor; bu kuralların önem seviyesi bu kanıta göre belirlendi.

## Çalışan sayfa ve yeniden tasarım

`scan` sayfayı Chrome'unuzda masaüstü ve telefon genişliğinde açar; model ve API anahtarı gerekmez. Kaynak kodun
gösteremediğini okur: gerçek kontrast, boyutlar, neyin neyi kapattığı, kırık görseller, betik hataları, hiç görünmeyen
içerik. Chrome'un hesapladığı her rengi okur, Tailwind 4'ün `oklch()` renkleri de buna dahildir. Üretilmiş sayfanın
alışkanlıklarını da yakalar: başlıkta renkle ayrılmış kelime, renkli gölge, her çağrı düğmesinin sonunda ok, orta noktayla
dizilmiş listeler, başlığın üstünde rozet.

Açılamayan, hata döndüren, tarayıcıyı giriş sayfasına yönlendiren ya da kendi yerinde giriş formu gösteren bir sayfa temiz
sayılmaz; tarama 2 koduyla durur.
Giriş gerektiren sayfa için `--cookie "ad=değer"` ya da `--header "Ad: değer"` verin; kabuk geçmişinde ve CI kayıtlarında
görünmesinler diye `AI_DESIGN_CHECK_COOKIE` ve `AI_DESIGN_CHECK_HEADERS` ortam değişkenlerini de kullanabilirsiniz. İkisi de yalnızca sayfanın kendi kaynağına (origin)
gider, yüklediği başka alan adlarına gitmez. Böyle bir
sayfayı bilerek denetlemek için `--allow-redirect` ve `--allow-status 404` var. Birden çok adres tek seferde taranır. Pull
request için `--format github` ekleyin. Yapılandırmada `designSystem` (`fonts`, `sizes`, `radii`, `colors`)
varsa sistemden sapanları da adıyla söyler.

Sayfanın yalnızca bir kısmını denetlemek için, örneğin uygulamanın kendi kabuğu içinde gösterilen bir CMS modülü için,
`--scope "[data-block-type=module-1]"` verin: yalnızca eşleşen öğenin içindekiler denetlenir, `redesign` de yalnızca o
kısmı ölçer ve planlar. `--ignore "nav"` bir kısmı dışarıda bırakır. İkisi de `scan`, `narrow` ve `redesign` ile çalışır ve
birden çok kez verilebilir; birden çok kapsam tek bir alan sayılır. Hiçbir şeyle eşleşmeyen kapsam temiz sayılmaz, çalışma
2 koduyla durur. Kapsamın dışından gelen yana kaydırma bildirilmez; betik hataları ise bütün sayfaya ait olduğu için
bildirilir. `aria-hidden="true"` altındaki yazı, örneğin başlığın arkasındaki soluk kod yağmuru, süstür: kontrast, yazı
boyutu ve öteki okuma kuralları ona bakmaz; gradyan, parıltı, sonsuz döngü gibi görsel alışkanlıkları arayan kurallar yine
bakar.

`redesign` ajanınıza (Claude Code ya da Codex) ihtiyaç duyan tek kısımdır, çünkü sayfanın ne göstermesi gerektiğine karar
vermek muhakeme ister. Ajan ekran görüntülerini, kodu ve konuyu inceler; her bölüm için bir kart yazar: ne söylediği, neyin
yanlış olduğu, kendi içeriğinden çıkan fikir, sitenizden kullandığı renkler. Kartlar ölçülen sayfaya karşı denetlenir. Sonra
numaralı düzeltmeler ve kartlar yeni bir git dalında geçiş geçiş uygulanır; içerik kaybeden, kural hatası ekleyen ya da daha
kötü görünen geçiş atılır. `--plan` kartlardan sonra durur, okuyup düzenlersiniz; `--brief` onları uygular. Yalnızca
çalışma ağacı temizken başlar (önce commit edin ya da stash'e alın); Ctrl-C yarım kalan geçişi geri alır.

Çalışma kartlardan önce ne kadar değişeceğine karar verir: `heavy` (çok iz var, bölüm bölüm yeniden kurulur), `polish`
(büyük ölçüde tasarlanmış: en çok iki bölümün görünüşü değişir, her biri ölçülen bir izin üzerinde; büyük fikirler öneri
olarak kalır) ya da `none` (sayfa iyi; birkaç küçük öneri yazılır, hiçbiri uygulanmaz). Sonra ürününüzden bir yön yazar: tek
cümlede ne olduğu, iki üç somut kelimeyle karakteri (clean, modern, sleek, minimal ya da premium olmaz), ait olduğu dünya,
zenginliği taşıyan bir iki an ve yalnızca bu ürüne ait bir imza ayrıntısı. Her kart görünüşü değiştirip değiştirmediğini ve
ziyaretçinin neyi farklı göreceğini söyler; `--plan` ve `BRIEF.md` her kartı "changes the look" ya da "fixes only" diye
işaretler, hiçbiri görünüşü değiştirmiyorsa bunu tek satırda söyler. İlk ekranın kartı görünüşü değiştirmek ve iddiasının
kanıtını göstermek zorundadır. Craft geçişinden sonra görsel denetim her kart için o değişikliğin sonraki ekran görüntüsünde
olup olmadığını sorar; aynı görünen kart bir deneme daha alır, sonra geçiş atılır. Önceki sürümden kalan bir `brief.json`
`--brief` ile çalışmaya devam eder; yönü olmayan bir `heavy` sayılır.

`--in-place` dal açmaz, commit atmaz ve commit edilmemiş işin (sizin ya da başka bir oturumun) bulunduğu ağaçta da çalışır:
atılan geçiş, sizin düzenlemeleriniz dahil, tam olarak önceki hâline döner; tutulan geçiş commit edilmemiş değişiklik olarak
kalır ve yaması kaydedilir, `git apply -R <yama>` onu geri alır. Çalışma sonunda değişen dosyalar ve geri alma komutları,
en yenisi önce olmak üzere yazılır. `--files "resources/views/home.blade.php,resources/css/**"` her geçişi bu yollar ya da
kalıplarla sınırlar: başka bir dosyayı değiştiren geçiş atılır. `--out <klasör>` planı, ekran görüntülerini, kayıtları ve
yamaları başka bir yere koyar (varsayılan, git'in yok saydığı `.ai-design-check/redesign`; proje dışındaki bir klasör de
olur). Oturum açmayı gerektiren bir sayfa için çerez vermek istemiyorsanız sayfayı kaydedip dosyayı verin:
`redesign ./page.html` (ya da `--html page.html`). `--build "<komut>"` ile geçişler kaynak dosyalarınızı düzenler ve komut
dosyayı yeniden üretir; onsuz geçişler dosyanın kendisini düzenler ve git'in tutmadığı bir dosya, geçiş atılınca bir
kopyasından geri yüklenir.

Çalışma bildiklerinizden başlar. Proje kökündeki `PRODUCT.md` (amaç, hedef kitle, üslup, kaçınılacaklar, rakipler) ve
`DESIGN.md` (koruduğunuz görsel sistem) sizin notlarınız olarak alıntılanıp çalışmaya ve craft istemine girer; `--product
<dosya>` ve `--design <dosya>` başka bir yeri gösterir. `PRODUCT.md` yoksa çalışma README'den, paket açıklamasından ve
sayfalardan `--out` klasörüne bir taslak yazar; çıktı tek satırda taslağı gözden geçirip köke taşımanızı söyler. Araç köke
kendisi hiçbir şey yazmaz. `--intent "<metin>"` bu çalışmadan ne istediğinizi söyler: çalışmaya ve kartlara yön verir,
`brief.json` içinde saklanır. `product` alanına koyduğunuz öteki alanlar (`context`, `audience`, `voice`, `competitors`,
`avoid` ya da kendi alanınız) iki isteme de ulaşır. Görünüşü değiştiren her kart içeriğine göre bir yerleşim seçer
(`split`, `product`, `photo`, `place`, `editorial`, `statement`, `collage`; görseli olmayan kısa bir bölüm için `centred`)
ve nedenini bir satırda söyler; görseli olan ortalı bir karşılama ekranı ya da yan yana aynı yerleşimi alan iki değişen
bölüm geri gönderilir. `brief.json` içindeki `"only": ["tam başlık"]` işi yalnızca bu bölümlerle sınırlar, gerisine
dokunulmaz. Bir kart `addsText` ve `replacesText` (`{ "from": "sayfadaki metin", "to": "yeni metin" }`) verebilir; bir
geçişin yapabileceği metin değişiklikleri yalnızca bunlardır. Hiçbir şey uygulanmadan önce derece, yön, amaç ve kartlar
yazılır; terminalde `Apply these passes? [y/N]` diye sorulur ve evet demezseniz hiçbir şey değişmeden durur, devam eden
komutu (`--brief <out>/brief.json --yes`) yazar. Ajanlar ve CI özeti alır, çalışma sürer.

Yalnızca bir komut onu çizdiğinde var olan bir sayfa için, örneğin oturum açmayı gerektiren ve statik HTML'e yazılan bir
CMS modülü: `redesign module-1.html --serve dist --render "php artisan module:export 1"`. `--serve <klasör>` o klasörü
127.0.0.1 üzerinde boş bir portta sunar (klasör listesi yok, dışındaki hiçbir şey yok) ve sayfa onun içindeki bir yoldur;
`--render "<komut>"` ilk ölçümden önce ve her geçişten sonra, `--build` sonrasında çalışır, başarısız olursa geçiş başarısız
bir derleme gibi atılır. `--build-minutes <n>` ikisinin süre sınırını belirler (varsayılan 10).

## Mobil uygulamalar

Uygulama klasörünü verin. SwiftUI ve Jetpack Compose okur: ölçek dışı boşluk (`spacing` ayarlı değilse 4 pt; `.padding(13)`, `10.dp`), ölçek dışı köşe,
Dynamic Type'ı yok sayan sabit yazı, çok kalın başlık, mor gradyan, yapay zekâ için `sparkles`, metinde emoji, Her Kelimesi Büyük
etiket, ağır gölge, büyük bulanıklık, sürekli dönen animasyon ve 44 pt / 48 dp altı dokunma alanı.

```bash
npx @enmera/ai-design-check Cebbin/Views
```

<p align="center">
  <img src="examples/before-after-ios.webp" width="520" alt="Cebbin iOS ana ekranı önce ve sonra">
</p>
<p align="center"><sub>App Store'daki iOS uygulamamız Cebbin; simülatörde, aynı veriyle. <a href="examples/redesign-cebbin-swiftui.mp4">16 düzeltmeyi izleyin</a>, her birinde arkasındaki SwiftUI satırı görünür, ya da 23 bulgudan 0'a inen <a href="examples/story-cebbin-swiftui.mp4">ilk denemeye</a> bakın.</sub></p>

## Projenizde kullanın

### Kuralları ajanınıza verin

Claude Code'da aynı beceriler eklenti olarak da kurulur: `/plugin marketplace add enmerasoftware/ai-design-check`, ardından
`/plugin install ai-design-check@ai-design-check`. Codex'te: `codex plugin marketplace add enmerasoftware/ai-design-check`.

Pakette iki beceri var; ikisi de `npx skills add enmerasoftware/ai-design-check` ile kurulur:

- **ai-design-check**: ajan bir ekrana dokunmadan önce kuralları okur, sonra denetçiyi çalıştırır.
- **ai-design-fix**: üretilmiş görünen ekranı onarır. Boşluk ve köşeleri ölçer, dört satırlık özet yazar (iş, iddia, kanıt,
  korunacaklar), ekranı en zararlıdan başlayarak elden geçirir, önce ve sonrayı bildirir. Sayıyı düşürmek için içerik silmez,
  gerekçesiz bulgu susturmaz.

Beceri kullanmıyorsanız ajan talimatlarınızı (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`)
`node_modules/@enmera/ai-design-check/RULES.tr.md` dosyasına yönlendirin.

### Her düzenlemeden hemen sonra bulguları gösterin

Kanca, ajanın az önce değiştirdiği dosyayı denetler ve bulguları ona geri verir. Claude Code'da `.claude/settings.json`:

```json
{
    "hooks": {
        "PostToolUse": [
            { "matcher": "Edit|Write|MultiEdit", "hooks": [{ "type": "command", "command": "npx -y @enmera/ai-design-check hook" }] }
        ]
    }
}
```

Aynı komut, standart girdiden JSON olarak `tool_input.file_path` ya da `file_path` veren her ajan kancasıyla çalışır. Temiz dosya
sessizce çıkar; bulgular stderr'e yazılır ve çıkış kodu 2 olur.

### CI'a ekleyin

```yaml
- run: npx @enmera/ai-design-check
```

Hatalarda, `--strict` ile uyarılarda da 1 koduyla çıkar. Hiçbir şey denetlenemediyse ya da bir seçenek veya ayar yanlışsa 2 koduyla
çıkar; böylece yanlış yazılmış bir yol geçmiş sayılmaz. `--json` makineler için yazdırır, `--format github` pull request
notları üretir.

### Var olan projede başlayın

Bugünkü bulguları kaydedin; bundan sonra yalnız yenileri bildirilir:

```bash
npx @enmera/ai-design-check --write-baseline
```

Bir yeri yok saymak için `--` sonrasına mutlaka gerekçe yazın. Gerekçesiz yok sayma geçerli olmaz:

```tsx
{/* ai-design-check-ignore-next-line type-scale -- tanıtım başlığı boyutu, bkz. DESIGN.md */}
// ai-design-check-ignore-file use-shared-components -- Button bileşeninin kendisi
```

## Komutlar

### `inventory`: öğe başına tek görünüm

```
Buttons  726 uses · 149 different looks · 147 without a shared component
   115×  <Button variant=outline size=sm>                       src/pages/projects/show.tsx:212
     9×  <button> bg-brand-400 font-semibold px-4 py-2 rounded-full text-on-brand text-sm   src/pages/home.tsx:91
Headings  229 uses · 69 different looks · 229 without a shared component
```

Temizlikten önce dağılmayı, sonra toparlandığını görmek için kullanın. Yerleşim sınıfları sayılmaz; yalnız konumu farklı iki kopya
tek görünüm sayılır.

### `narrow`: telefon ve uzun diller

```bash
npx @enmera/ai-design-check narrow examples/narrow-de.html --width 320
```

Sayfayı Chrome'unuzda telefon ve masaüstü genişliğinde açar, yalnız açık sayfada görülenleri bildirir: yana kayma ve nedeni,
kesilen yazı, sığsın diye küçülen yazı, telefonda gizlenen içerik. En uzun dilinizle çalıştırın; Almanca etiketler çoğu zaman
İngilizceden %30–40 uzundur. [Bozuk örneği](examples/narrow-de.html) ve [düzeltilmiş halini](examples/narrow-de.fixed.html) deneyin.

`--stress` ile en kötü veriyle yeniden çalışır: uzun adlar, büyük sayılar, %40 uzun metin. Yerleşimi sınar; "1 üye" gibi dil
bilgisi için ekrana gerçek veriyle bakmak gerekir.

### `system`: markanızdan tasarım sistemi

```bash
npx @enmera/ai-design-check system --character calm --brand "#1E5A63" --kind app --out design-system
```

Yeni ya da değişkenleri olmayan ürünler için. Bir karakter (`calm`, `precise`, `friendly`, `warm`, `bold`, `editorial`,
`luxurious`, `playful`, `technical`, `trustworthy`), marka rengi ve ekran türü (`dashboard`, `app`, `marketing`, `reading`) verin.

| Çıktı | Ayrıntı |
|---|---|
| Yazı tipleri | Arayüz, başlık, sayı ve kod için 50 yazı tipli kitaplıktan. `fonts --character calm` seçenekleri listeler |
| Yazı ölçeği | Dynamic Type ve Material 3 ile eşleşen sekiz rol |
| Renkler | Açık ve koyu; durum etiketleri ve düğmeler dahil her yazı ve zemin çifti WCAG 2'de 4,5:1'i geçer |
| Biçim | 4 px boşluk ölçeği, iç içe uyumlu köşeler, denetim yükseklikleri, kart iç boşluğu |
| Dosyalar | `tokens.css`, Tailwind `theme.css`, Bootstrap `bootstrap.css` ve `_variables.scss`, `tokens.json`, `DesignSystem.swift`, `DesignSystem.kt`, `preview.html` |

Bootstrap 5.3 ile `bootstrap.css` dosyasını Bootstrap'in kendi CSS'inden sonra bağlayın: açık tema varsayılandır, koyu tema
`data-bs-theme="dark"` altında geçerli olur. Bootstrap'in alanlara, onay kutularına, menülere, sayfalamaya ve diğer
bileşenlere derlenmiş mavisini de değiştirir. Kaynaktan derleyen projeler `_variables.scss` dosyasını Bootstrap'ten önce içe
aktarır.

### `story`: önce/sonra videosu

```bash
npx @enmera/ai-design-check story screen.before.html screen.html --out story.mp4 --music track.mp3 --still frame.png
```

12 saniyelik kare video: her bulgu tek tek işaretlenir, sayı düşerken yeni ekrana geçilir, sonunda kapanış kartı gelir. Dosya ya da
adres alır; yalnız Chrome ve ffmpeg ister.

### Diğer komutlar

```bash
npx @enmera/ai-design-check rules --tr   # kuralları listele
npx @enmera/ai-design-check init         # varsayılanlarla ayar dosyası yaz
```

<details>
<summary><strong>Ayarlar</strong></summary>

Proje kökünde `ai-design-check.json` (ya da `.design-rules.json`):

```json
{
    "include": ["resources/js", "lang"],
    "ignore": ["resources/js/vendor/**"],
    "i18n": { "files": ["lang/*.json"], "keysAreSource": true, "framework": ["Reset Password"] },
    "properNouns": ["Brand Studio", "Core Web Vitals", "Privacy Policy"],
    "componentDirs": ["**/components/ui/**"],
    "components": { "button": "Button", "input": "Input" },
    "sharedComponents": ["Button", "Badge", "Input", "Card"],
    "looks": { "badge": "StatusBadge", "card": "Tile or SectionCard", "heading": "Heading", "link": "LinkButton" },
    "rules": { "pulse-for-live-only": "off" },
    "spacing": { "base": 6 },
    "allow": {
        "type-scale": ["src/marketing/hero.tsx:text-[44px]"],
        "glow-in-charts-only": ["src/components/charts/**"]
    }
}
```

| Anahtar | Anlamı |
|---|---|
| `i18n.files` | JSON sözlükleri. `keysAreSource` ile anahtarlar İngilizce kaynaktır ve onlar da denetlenir. `framework` değiştiremeyeceğiniz anahtarları listeler |
| `properNouns` | Büyük harfini koruyan adlar |
| `allow` | Kural başına `"glob"` ya da `"glob:tam eşleşme"` |
| `spacing` | Boşluk ölçeği: `6`, `[4, 6, 8, 12]` ya da `{ "base": 4, "values": [18], "native": { "base": 8 } }`. Aşağıya bakın |
| `rules` | Kural başına `"off"`, `"info"`, `"warn"` ya da `"error"` |
| `componentDirs` | Ham `<button>` ve `<input>` kullanılabilecek yerler |
| `components` | Ham öğe → yerine kullanılacak ortak bileşen |
| `sharedComponents` | Görünümü özelliklerden gelen bileşenler; `className` yalnız konumlandırır |
| `looks` | Elle yazılmış her görünümün sahibi olan bileşen. `false` o türü kapatır |

**Boşluk ölçeği.** `spacing-scale`, değeri aşağıdakilerden okuyabildiği ilkiyle karşılaştırır; rapor hangisini kullandığını
yazar:

1. Yapılandırma dosyasındaki `spacing`.
2. Tailwind 4 `@theme`: `--spacing` ızgaradır, `--spacing-*` basamak ekler.
3. `tailwind.config.*`, metin olarak okunur, asla çalıştırılmaz: `theme.spacing` basamakların yerini alır, `theme.extend.spacing`
   4 px ızgarasına ekler. İşlev, değişken, yayma (spread) ve preset bu yolla okunamaz.
4. SCSS dosyalarınızdaki Bootstrap `$spacer` ve `$spacers` değerleri, metin olarak okunur: basamakları 4 px ızgarasına eklenir.
5. `:root` değişkenleri: `--spacing` ızgaradır, `--space-*` ve `--spacing-*` 4 px ızgarasına basamak ekler, hiçbirini çıkarmaz.
6. 4 px ızgarası.

Var olup okunamayan kaynak (`calc()`, `clamp()`, birbirini tutmayan iki dosya, tek sayıyla anlatılamayan kök yazı boyutu) 4 px
ızgarasını bırakır ve rapora not düşer. Tahmin yürütülmez, sonraki kaynaklar denenmez. Kararı siz vermek için `spacing` ayarlayın.
`base` olmadan liste verilirse kenar, iç boşluk ve aralıklar listede olmalıdır; genişlik, yükseklik ve konumların yalnız listenin
ortak bölenine uyması yeter.

Uygulama kodu (SwiftUI, Compose, Flutter, React Native) yapılandırma dosyasındaki `spacing` değerini (web'den farklıysa `native`)
ya da 4 pt/dp kullanır. Başka bir şey okumaz: uygulama kodundaki sabitlerin bakılacak ortak bir yeri yoktur, uygulamanın
yanındaki web teması da uygulama hakkında bir şey söylemez.

</details>

<details>
<summary><strong>Denetçinin okuduğu dosyalar</strong></summary>

`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, Blade, CSS ve SCSS, çeviri JSON'u, SwiftUI (`.swift`) ve Jetpack Compose (`.kt`). Düz
Node 20+ ile çalışır. Sınıf kuralları yalnız sınıf dizgilerini okur (`class`, `className`, `cn()`, `clsx()`, `cva()`,
`twMerge()`), yorum ve metinlerle eşleşmez; Tailwind'in sınıflarını da Bootstrap'inkileri de tanır. CSS kuralları stil
dosyalarını, `<style>` bloklarını ve `style=""` niteliklerini bildirim bildirim okur. Projeye kopyalanmış bir çatının kendi
stil dosyası (lisans başlığından tanınan Bootstrap, Tailwind çıktısı ve benzerleri) okunmaz: oradaki değerler sizin değil,
çatının seçimidir.

</details>

<details>
<summary><strong>Kural ekleme</strong></summary>

Kurallar [`rules.json`](rules.json) içinde: `id`, `area`, `severity`, `en` ve `tr` altında `title`, `rule`, `why`, `fix` ve isteğe bağlı
`check`:

- `class`: sınıf dizgisinde desen (ya da desen listesi); `unless`, `with`, `exceptElements`, `unlessBefore` ve `css` ile.
  `css` stil dosyalarında bir desendir ya da bildirim bildirim okunan girdilerdir (`property`, `value`, `scale`, `hue` ile
  `gradient`, `selector`, `unless`, `unlessRule`)
- `native`: `swift` ve `kt` altında platform başına desen; `notMultipleOf`, `min`, `max`, `unlessBefore`, `unlessAfter`, `onlyIf` ile
- `regex`: yorumlar hariç kodda desen; `flags` ve `files` ile
- ya da yapısal denetim

RULES.md ve RULES.tr.md için `npm run docs`, pull request öncesinde `npm test` çalıştırın.

</details>

## Lisans

MIT
