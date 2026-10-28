# Enmera tasarım kuralları

[English](RULES.md) · `rules.json` dosyasından üretilir; o dosyayı düzenleyip `npm run docs` çalıştırın. **Denetlenir** işaretli kuralları `npx @enmera/ai-design-check` bulur; diğerlerine insanlar ve ajanlar bakar.

## Yazım

### Arayüz metninde yalnız ilk kelime büyük

`sentence-case` · hata · denetlenir

**Kural:** Yalnız ilk kelime ve özel adlar büyük harfle başlar: "Kelime takibi", "Bu hafta yükselen". Otomatik büyük harf dönüştürücü yok; metin nasıl yazıldıysa öyle görünür.

**Neden:** Her kısa etikette her kelimenin büyük yazılması bağırır ve Türkçe yazım kuralı değildir. Microsoft Türkçe stil kılavuzu (4.1.5): yalnız özel adlar ve ilk kelime; TDK'de her kelime büyük yalnız eser, belge ve kurum adlarında.

**Nasıl düzeltilir:** Özel adlar (Google İşletme Profili, Search Console), resmî kategori ve belge adları (Sağlık ve Fitness, Gizlilik Politikası), kısaltmalar (AI, SERP) ve dil kodu rozetleri olduğu gibi kalır. Yol ayracından sonraki ilk kelime büyük: "Site sağlığı › Site denetimi".

### Süs amaçlı büyük harf ve harf aralığı yok

`no-decorative-uppercase` · uyarı · denetlenir

**Kural:** Küçük, büyük harfli ve harf aralıklı etiket yok (başlık üstü etiket, kahraman alanı hap etiketi, "NAVIGATION" gibi bölüm başlığı).

**Neden:** Yapay zekâ üretimi arayüzlerin en bilinen kalıbıdır ve okumayı zorlaştırır: kelimeleri biçiminden tanırız.

**Nasıl düzeltilir:** Etiketi normal yazım ve harf aralığıyla yazın. Kodlar, dil kodu rozeti ve baş harf avatarı büyük kalabilir.

### Etiket yerine sığar

`short-labels` · not · gözden geçirilir

**Kural:** Menüde ya da sekmede kesilen etiket kısaltılır; aynı şey her yerde aynı kelimeyle söylenir (kısa etikette "keyword" = "kelime": "Kelime araştırması").

**Neden:** Kesilen etiket anlamı gizler ve yarım görünür.

**Nasıl düzeltilir:** Etiketi kısaltın; yazıyı küçültmeyin.

## Yazı ölçeği

### Yazı boyutu yalnız ölçekten

`type-scale` · hata · denetlenir

**Kural:** Temadaki ölçek kullanılır: text-2xs (11 px, en küçük), text-xs, text-sm, text-base … Elle text-[10px], text-[13px] yazılmaz.

**Neden:** Tek seferlik boyutlar ekranlar arasında küçük farklar biriktirir. 11 px altı metin okunmaz.

**Nasıl düzeltilir:** Temaya --text-2xs: 0.6875rem (satır yüksekliği 1rem) ekleyin; 9–11 px → text-2xs, 12 px → text-xs, 13 px → text-sm. Tanıtım sitesinin büyük başlık boyutları izin listesine yazılır.

## Köşe ve yüzey

### Köşe yuvarlaklığı yalnız ölçekten

`radius-scale` · hata · denetlenir

**Kural:** rounded-md … rounded-3xl ve rounded-full kullanılır; tanıtım sitesinin büyük yüzeyleri tek bir ortak değer alır (rounded-panel). Elle köşe yalnız 5 px'e kadar mikro öğelerde ve cihaz/ikon çizimlerinde.

**Neden:** Yan yana 28, 30 ve 32 px'lik köşeler sistem değil gürültü gibi okunur.

**Nasıl düzeltilir:** En yakın ölçek adımını seçin ya da tek bir adlı değer ekleyin.

### Kart içinde kart yok

`no-nested-cards` · uyarı · gözden geçirilir

**Kural:** Kartın içindeki gruplar boşluk, yazı ve ayraçla ayrılır; içe ikinci bir çerçeveli kart konmaz.

**Neden:** İç içe çerçeve anlamı olmayan derinlik ekler.

**Nasıl düzeltilir:** Düzleştirin: ikinci kenarlık ve gölge yerine ayraç ya da hafif zeminli blok.

## Bileşen ve tekrar

### Etkileşimli öğeler ortak bileşenden

`use-shared-components` · uyarı · denetlenir

**Kural:** Sayfalar ortak Button, Input, Select, Textarea ve Checkbox bileşenlerini kullanır; ham <button>, <input>, <select>, <textarea> yazılmaz. Ham öğeler yalnız bileşen klasörünün içinde durur.

**Neden:** Her ham öğe düğmenin yeni bir kopyasıdır: bir yerde yükseklik, odak halkası ya da köşe farklı olur ve bir sonraki düzeltme onu kaçırır.

**Nasıl düzeltilir:** Bileşenle değiştirin; bileşende gereken görünüm yoksa görünümü bileşene ekleyin.

### Ortak bileşene dışarıdan görünüm verilmez

`no-style-overrides` · uyarı · denetlenir

**Kural:** Button, Badge, Input, Card gibi ortak bileşenlere verilen className yalnız yerleştirir (genişlik, kenar boşluğu, hizalama, ızgara konumu). Renk, köşe, iç boşluk, yükseklik, yazı ve kenarlık bileşenin variant/size seçeneklerinden gelir.

**Neden:** Dışarıdan verilen görünüm bileşenin gizli bir kopyasıdır: aynı düğme iki ekranda farklı görünür; tasarım sistemi tam da bunu engellemek için vardır.

**Nasıl düzeltilir:** Görünümü bileşenin adlı bir variant ya da size seçeneğine taşıyın ve onu kullanın.

### Tekrarlanan kalıp bileşen olur

`repeated-markup` · uyarı · denetlenir

**Kural:** Birden çok yerde tekrarlanan aynı uzun sınıf listesi (kart, rozet, gösterge kutusu, bölüm başlığı) tek bir ortak bileşene çıkarılır.

**Neden:** Kopyalar zamanla ayrışır: birine yeni boşluk verilir, diğeri eski köşede kalır. Tek bileşen tek düzeltme ve daha az kod demektir.

**Nasıl düzeltilir:** Öğeyi bir bileşene (ya da var olanın bir görünümüne) çıkarın ve kopyaları onunla değiştirin.

## Seçiciler

### Tek seçici dili

`selector-language` · hata · gözden geçirilir

**Kural:** İçerik değiştiren ana seçim (sayfa sekmeleri, konu grupları, ayrı listeler) bölmeli seçicidir. Alt sekmeleri aynı satırda, sağında, ince ayraçtan sonra kutusuz metindir (seçili olan hafif zeminli). Aynı listeyi daraltan süzgeç, listenin içinde hap düğmedir.

**Neden:** Alt alta, benzer ağırlıkta iki seçici sırası hangisinin ana seçim olduğunu gizler. Alt çizgili sekme denendi ve beğenilmedi.

**Nasıl düzeltilir:** Alt alta iki seçici sırası ve alt çizgili sekme yok. Kart içindeki küçük varyant seçimi küçük bölmeli seçicidir.

## Yerleşim

### Geniş tablo tam genişlikte

`full-width-tables` · uyarı · gözden geçirilir

**Kural:** Çok sütunlu veri tablosu tam genişlikte durur; artan genişliği son sütun alır (w-full, hücrede max-w-0 truncate). Az sütunda tarih ile değer birbirinden kopmaz, uzun adlar kesilmez.

**Neden:** Yan sütuna sıkışan tablo adları keser; satır azken altında boş alan bırakır.

**Nasıl düzeltilir:** Yan kartları tablonun altına, iki sütunlu masonry yerleşime alın.

### Yüksekliği farklı kartlar ızgara tabanlı masonry'de

`masonry` · uyarı · denetlenir

**Kural:** Yüksekliği farklı kartlar ızgara tabanlı masonry'ye girer (iki sütun, soldan sağa sıra). CSS columns kullanılmaz; altı boş kalan dar sütun bırakılmaz.

**Neden:** CSS columns Chrome'da gölgeyi sütun başında bölüyor ve kartları sütun sütun diziyor.

**Nasıl düzeltilir:** Her kartı en kısa sütuna yerleştiren ızgara tabanlı masonry bileşeni kullanın.

### Okunur satır uzunluğu ve aralığı

`readable-measure` · uyarı · gözden geçirilir

**Kural:** Akan metin satırda yaklaşık 80 karakteri geçmez (max-w-prose / max-w-3xl), satır aralığı en az 1,3; başlığın üstündeki boşluk altındakinden büyüktür.

**Neden:** Uzun satırda göz bir sonraki satırın başını kaybeder.

**Nasıl düzeltilir:** Kartı değil paragrafı daraltın.

### Boşlukta ritim

`spacing-rhythm` · not · gözden geçirilir

**Kural:** İlgili öğeler sıkı, bölümler arası geniş. Her yerde aynı boşluk ritimsizdir.

**Neden:** Gruplama her şeyden önce boşluktan okunur.

**Nasıl düzeltilir:** İki üç adım kullanın: grup içi, gruplar arası, bölümler arası.

## Menü

### Menü işe göre, yer önce kararlaştırılır

`menu-by-job` · uyarı · gözden geçirilir

**Kural:** Özellik yazılmadan önce yeri kararlaştırılır: hangi menü bölümü, ayrı satır mı var olan sayfanın sekmesi mi, hangi adres öneki. Aynı işin sayfaları menüde tek satır, sayfada sekmedir. Bölümler katlanır; içinde bulunulan bölüm açık kalır.

**Neden:** Yoksa menü, birbiriyle ilgili işlerin dört ayrı yere düştüğü elli satırlık düz bir listeye dönüşür.

**Nasıl düzeltilir:** Taşınan adres 301 ile yönlenir (alt yol ve sorgu korunur); dış servislere kayıtlı geri dönüş adresleri taşınmaz. Yardım metinlerindeki "nerede" yolu menüyle aynı yazılır.

## Görsel dil

### Emoji yerine çizgi ikon

`icons-not-emoji` · uyarı · denetlenir

**Kural:** Arayüz işaretleri tek bir setten çizgi ikondur (lucide). Emoji ve ✓ gibi metin işaretleri süs olarak kullanılmaz; içerik olan emoji (sohbet emoji seçici) kalır.

**Neden:** Emoji her platformda farklı çizilir ve üretilmiş gibi okunur.

**Nasıl düzeltilir:** Metin boyutunda karşılık gelen ikonla değiştirin.

### Gradyan metin ve mor gradyan yok

`no-ai-gradients` · hata · denetlenir

**Kural:** Metin düz renktir. Mor, menekşe ya da çivit gradyan ve bölümlerin arkasında süs amaçlı radyal parıltı yok.

**Neden:** Yapay zekâ üretimi arayüzlerin en tanınan izleridir.

**Nasıl düzeltilir:** Marka rengini düz kullanın; renk anlam taşır (durum, seri, seçim).

### Kartın kenarında renkli kalın çizgi yok

`no-side-stripe` · uyarı · denetlenir

**Kural:** Kartın ya da uyarının tek kenarında kalın renkli çizgi yok.

**Neden:** Yapay zekâ üretimi arayüzün en yaygın vurgusudur ve yuvarlak köşeyle çatışır.

**Nasıl düzeltilir:** Durum rozeti, ikon ya da hafif renkli zemin kullanın.

### Parıltı yalnız grafikte

`glow-in-charts-only` · uyarı · denetlenir

**Kural:** Renkli parıltı gölgesi yalnız grafik dilindedir (puan halkası, grafik çizgisi); düğme, kart ve metin parlamaz.

**Neden:** Her yerde parıltı gürültüdür; veride parıltı gözü sayıya çeker.

**Nasıl düzeltilir:** Kaldırın ya da grafik bileşenini izin listesine yazın.

### Okunur kontrast

`legible-contrast` · uyarı · gözden geçirilir

**Kural:** Metin WCAG AA'yı karşılar (4,5:1, büyük metin 3:1); renkli zeminde gri metin yok.

**Neden:** Renkli zeminde gri soluk görünür ve güneş altında okunmaz.

**Nasıl düzeltilir:** Zemin renginin koyu tonunu ya da beyaza yakın rengi kullanın.

### Her başlığın üstünde ikon kutusu yok

`no-icon-tile-stack` · uyarı · gözden geçirilir

**Kural:** Her birinde yuvarlak ikon kutusu, başlık ve iki satır metin olan aynı kartlardan ızgara bir şablondur, yerleşim değildir. İkonu satır içinde kullanın ya da hiç kullanmayın; öne çıkanı değiştirin.

**Neden:** Her üreticinin varsayılan çıktısıdır ve ürün hakkında hiçbir şey söylemez.

**Nasıl düzeltilir:** İkon yerine gerçek içerikle başlayın (bir sayı, bir ekran görüntüsü, bir örnek).

## Erişilebilirlik

### Odak halkası yerine yenisi konmadan kaldırılmaz

`focus-ring-removed` · hata · denetlenir

**Kural:** outline-none / outline-hidden yalnız aynı öğede görünür bir focus-visible biçimiyle (ring, outline ya da border) birlikte kullanılır.

**Neden:** Klavye kullanan kişi nerede olduğunu kaybeder. WCAG 2.4.7 (görünür odak), 2.4.11 (odak gizlenmez).

**Nasıl düzeltilir:** focus-visible:ring-2 (ya da bileşenin odak biçimini) ekleyin; Tailwind 4'te outline-none yerine outline-hidden kullanın, zorlanmış renk kipinde çerçeve kalsın. Odağı programla alan diyalog ve açılır pencere kapsayıcıları muaftır.

### Yalnız ikonlu düğmenin adı vardır

`icon-button-name` · hata · denetlenir

**Kural:** Yalnız ikon gösteren düğme ya da bağlantı aria-label (ya da title veya görünmeyen metin) taşır.

**Neden:** Ekran okuyucu amacı olmadan yalnız "düğme" der; WCAG 4.1.2 ad, rol, değer.

**Nasıl düzeltilir:** Eylemi söyleyen bir aria-label ekleyin ("Kelimeyi sil").

## Hareket

### Nabız yalnız canlı veride

`pulse-for-live-only` · not · denetlenir

**Kural:** Nabız atan nokta şu an süren bir işi anlatır; süs için atmaz.

**Neden:** Sahte canlılık gerçek uyarıları görmezden gelmeyi öğretir.

**Nasıl düzeltilir:** Animasyonu süren duruma bağlayın; değilse sabit nokta gösterin.

### Kendiliğinden kayan şerit yok

`no-marquee` · uyarı · denetlenir

**Kural:** İçerik kendiliğinden kaymaz.

**Neden:** Dikkat ister ve içeriğinin yarısını hep gizler.

**Nasıl düzeltilir:** Kaydırılabilen sabit bir satır ya da kısa liste.

### Geçiş tüm özelliklere değil, adlı özelliklere

`no-transition-all` · uyarı · denetlenir

**Kural:** transition-all / transition: all yok; transform ve opacity canlandırılır, renk geçişi adıyla verilir.

**Neden:** transition: all kimsenin istemediği yerleşim ve boyut değişimlerini de canlandırır, kare kaybettirir.

**Nasıl düzeltilir:** transition-colors, transition-opacity, transition-transform ya da transition-[width].

### Arayüzde zıplama ve taşma eğrisi yok

`no-bounce-easing` · uyarı · denetlenir

**Kural:** Denetim, panel ve listelerde animate-bounce ve taşan cubic-bezier yok.

**Neden:** Zıplama çalışılan ekranda oyuncak ve eski görünür, tekrarlanan işi yavaşlatır.

**Nasıl düzeltilir:** Girişte ease-out, çıkışta ease-in, 150–300 ms.

### "Hareketi azalt" tercihine uyulur

`reduced-motion` · not · gözden geçirilir

**Kural:** Süs amaçlı ve büyük hareket prefers-reduced-motion altında durur ya da küçülür (motion-safe: / motion-reduce:).

**Neden:** Hareket denge rahatsızlığı tetikler; WCAG 2.3.3.

**Nasıl düzeltilir:** Uzun ya da döngülü animasyonların başına motion-safe: ekleyin.

## Veri ve sayılar

### Sayı neye göre olduğunu söyler

`numbers-with-context` · uyarı · gözden geçirilir

**Kural:** Öne çıkan sayı neyle kıyaslandığını söyler ("geçen haftaya göre −1,2"); zamanla değişiyorsa yakın geçmişini gösterir.

**Neden:** Tek başına "Ortalama sıra 13,8" bunun iyi haber olup olmadığını söylemez.

**Nasıl düzeltilir:** Sayının altına değişimi ve dönemini ekleyin.

### Boş veride boş durum

`empty-states` · uyarı · gözden geçirilir

**Kural:** Veri yoksa bir sonraki adımı söyleyen boş durum gösterilir; boş grafik ya da tirelerle dolu tablo değil.

**Neden:** Boş grafik bozuk görünür.

**Nasıl düzeltilir:** Neden boş olduğunu ve neyin dolduracağını söyleyin (bağlayın, çalıştırın, ilk kontrolü bekleyin).

### Tablo ve göstergelerde eşit genişlikte rakam

`tabular-numbers` · not · gözden geçirilir

**Kural:** Kıyaslanan ya da değişen sayılar (tablo sütunları, göstergeler, sayaçlar, süreler) tabular-nums kullanır; tabloda sağa hizalanır.

**Neden:** Orantılı rakamlar sütunları eğri büğrü yapar, değer değişince sayı zıplar.

**Nasıl düzeltilir:** Hücreye ya da tabloya tabular-nums ekleyin; sayısal sütunda text-end.

## Yerelleştirme

### Büyük-küçük harf dönüşümü dili belirtir

`locale-aware-case` · uyarı · denetlenir

**Kural:** Arayüz metninde toUpperCase()/toLowerCase() yerine toLocaleUpperCase(dil)/toLocaleLowerCase(dil) kullanılır.

**Neden:** Türkçe i/İ ve ı/I: "istanbul".toUpperCase() "ISTANBUL" verir, "İSTANBUL" değil.

**Nasıl düzeltilir:** Arayüz dilini verin; anahtar ve kimlikler için düz yöntem doğrudur (izin listesine yazın).

### Sayı, tarih ve para dil biçimleyicisinden

`locale-number-format` · uyarı · denetlenir

**Kural:** Arayüzdeki sayılar projenin biçimleyicisinden geçer (açık dil verilmiş Intl). toFixed(), dilsiz toLocaleString() ve "$" + değer yok.

**Neden:** 1,255.00 ile 1.255,00: yanlış ayraç değeri bin kat yanlış okutur; sunucu ve tarayıcı farklı metin üretir.

**Nasıl düzeltilir:** Ortak biçim yardımcısını kullanın; düz toFixed() yalnız makine değerleri için.

### Çoğul, çoğul sistemiyle

`no-naive-plural` · uyarı · denetlenir

**Kural:** sayı === 1 ? "öğe" : "öğeler" ve + "s" yok: çoğul, çeviri sisteminin çoğul biçiminden geçer (trans_choice, ICU, Intl.PluralRules).

**Neden:** Dillerde altıya kadar çoğul türü vardır; yalnız İngilizceye göre yazılmış mantık her çeviriyi bozar.

**Nasıl düzeltilir:** Çeviri katmanının çoğul yardımcısını sayıyla kullanın.

### Parçalardan yapıştırılmış cümle yok

`no-concatenated-translation` · uyarı · denetlenir

**Kural:** Bir cümle yer tutuculu tek bir çeviri anahtarıdır; t('a') + değer + t('b') yazılmaz.

**Neden:** Kelime sırası dile göre değişir: Türkçede fiil sondadır.

**Nasıl düzeltilir:** Tek anahtar: t(':count keywords on page one', { count }).

## Etkileşim

### Süzgeç anında tepki verir

`instant-filters` · not · gözden geçirilir

**Kural:** Süzgeç değeri anında yerel durumda değişir; liste yenilenirken soluklaşmaz; sekmeler önden yüklenir.

**Neden:** Denetim sunucuyu beklerken kıpırdamazsa bozuk hissettirir.

**Nasıl düzeltilir:** İyimser yerel değer, ilerleme çubuğu olmadan arka planda yenileme, sekmelerde önden yükleme.

## Metin

### Pazarlama klişesi yok

`no-buzzwords` · uyarı · denetlenir

**Kural:** "Yeni nesil", "devrim niteliğinde", "kusursuz", "sınırları zorlayan", "üst düzey deneyim" yok. Ne yaptığını söyleyin, varsa sayıyla.

**Neden:** Bu kelimeler üretilmiş metnin anında fark edilen izleridir ve ölçülebilir bir şey vaat etmez.

**Nasıl düzeltilir:** İddiayı ölçülmüş bilgiyle değiştirin.

### Düğme ne yaptığını söyler

`specific-action-labels` · uyarı · denetlenir

**Kural:** "Gönder", "Tamam", "Buraya tıklayın", "Evet/Hayır" yok: etiket eylemi ve nesnesini söyler ("Değişiklikleri kaydet", "Kelimeyi sil").

**Neden:** Genel etiket tüm pencereyi okutur ve yıkıcı düğmeye yanlışlıkla basmayı kolaylaştırır.

**Nasıl düzeltilir:** Fiil + nesne, yalnız ilk kelime büyük.

### Hata ne olduğunu ve ne yapılacağını söyler

`error-copy` · uyarı · denetlenir

**Kural:** "Hay aksi", "Bir şeyler ters gitti", "Bir hata oluştu", "Geçersiz giriş" yok: sorunu ve sonraki adımı söyleyin.

**Neden:** Belirsiz hata kişiyi takılı bırakır ve destek talebi doğurur (GOV.UK hata mesajı rehberi).

**Nasıl düzeltilir:** "Geçmiş bir tarih girin", "Dosya 5 MB'tan büyük: daha küçük bir dosya seçin".

### Üç nokta yerine üç nokta karakteri

`ellipsis-character` · not · denetlenir

**Kural:** "Yükleniyor…", "Ara…" tek … karakteriyle yazılır.

**Neden:** Üç ayrı nokta farklı satır kırar ve düzgün yazının yanında yazım hatası gibi durur.

**Nasıl düzeltilir:** Arayüz metinlerinde ... yerine … yazın.
