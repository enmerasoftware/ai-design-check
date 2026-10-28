# Enmera tasarım kuralları

[English](RULES.md) · `rules.json` dosyasından üretilir; o dosyayı düzenleyip `npm run docs` çalıştırın. **Denetlenir** işaretli kuralları `npx @enmera/design-check` bulur; diğerlerine insanlar ve ajanlar bakar.

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
