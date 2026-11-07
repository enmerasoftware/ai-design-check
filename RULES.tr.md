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

### Her çağrıda ok yok

`no-arrow-suffix` · not · denetlenir

**Kural:** Düğme ve bağlantılar alışkanlık olarak okla (→, ›, » ya da ok ikonu) bitmez; tek bir bağlantıda sorun yok.

**Neden:** Etiket nereye gittiğini zaten söyler; her işlemdeki ok üretilmiş sayfa alışkanlığıdır.

**Nasıl düzeltilir:** Okları kaldırın; yalnız sonraki adım gibi ilerlemeyi gösterdiği yerde bırakın.

### Orta noktayla dizilmiş liste yok

`no-middle-dot-lists` · not · denetlenir

**Kural:** Kısa satırlar üç ya da daha çok öğeyi · ya da • ile dizmez ("Hızlı · Gizli · Ücretsiz"); alt bilgi satırı ve tarihli yazar satırı sorun değil.

**Neden:** Noktalarla dizilmiş üç kelime bir cümleden azını söyler; bu biçim üretilmiş sayfa alışkanlığıdır.

**Nasıl düzeltilir:** Tek cümle olarak yazın ya da önemli olan tek öğeyi bırakın.

### Düğme ve etiketlerde nokta yok

`no-trailing-period-labels` · not · denetlenir

**Kural:** Düğme, sekme, menü öğesi ve kısa etiketler noktasız biter; yardım metnindeki cümleler noktasını korur.

**Neden:** Nokta bir komutu cümleye çevirir ve düğme sırasını düzensiz gösterir.

**Nasıl düzeltilir:** Sondaki noktayı kaldırın.

### Kısa yer tutucular

`short-placeholders` · not · denetlenir

**Kural:** "Her şeyi ara...", "Buraya yazın..." ya da "E-postanızı buraya girin" yok; yer tutucu bir iki kelime ya da örnek değerdir.

**Neden:** Uzun yer tutucu etiketi tekrarlar, yazınca kaybolur ve dolgu gibi okunur.

**Nasıl düzeltilir:** "Ara" ya da "ad@sirket.com" gibi bir örnek.

### Metin kesilmez

`text-not-clipped` · uyarı · denetlenir

**Kural:** Etiket, düğme ve tablo hücreleri 320 px'te metnin tamamını gösterir. Üç noktayla kısaltma yalnız tam metin bir dokunuş uzaktaysa (title, ipucu, ayrıntı) serbesttir.

**Neden:** Kesilen etiket anlamını değiştirebilir ("Tümünü sil…" neyi?) ve çeviriler İngilizceden çoğu zaman %30–40 uzundur.

**Nasıl düzeltilir:** Metni alt satıra geçirin; gerçekten tek satır olmalıysa tam metni title'da ve ayrıntı görünümünde tutun.

### Başlık üstünde küçük etiket yok

`no-eyebrow-label` · uyarı · denetlenir

**Kural:** Harf aralıklı ya da büyük harfli minik etiket, başlığın hemen üstünde kendi satırında durmaz.

**Neden:** Başlık kendi ağırlığını taşır; etiket sökülmemiş iskeledir.

**Nasıl düzeltilir:** Silin ya da bilgisini alttaki cümleye katın.

### Uzun çizgi yığını yok

`no-em-dash-saturation` · not · denetlenir

**Kural:** Yaklaşık 500 karakterde bir olmak üzere sekiz ya da daha çok uzun çizgi yeniden yazılır.

**Neden:** Biri noktalama işaretidir; sayfa dolusu üretilmiş metin ritmidir.

**Nasıl düzeltilir:** Nokta ve virgül kullanın.

### Slogan ritmi yok

`no-aphorism-cadence` · not · denetlenir

**Kural:** Bölümler sürekli "X. Y yok." ya da "Özellik değil. Platform." biçiminde bitmez; bir kez sorun değil, üç kez tiktir.

**Neden:** Yapay zıtlık, okurun doğrulayabileceği bir şey söylemez.

**Nasıl düzeltilir:** Ürünün ne yaptığını sayı ya da bilgiyle söyleyin.

### "Tiyatro" kalıbı yok

`no-theater-copy` · not · denetlenir

**Kural:** Bir şeyi "güvenlik tiyatrosu" ya da "verimlilik tiyatrosu" diye geçiştirmeyin.

**Neden:** Sık tekrarlanan üretilmiş bir tiktir ve asıl savı atlar.

**Nasıl düzeltilir:** O şeyin ne yapıp ne yapmadığını açıkça söyleyin.

### Kart bir şeyi bir kez söyler

`no-repeated-label` · not · denetlenir

**Kural:** Aynı metin tek kartta üç ya da daha çok kez geçmez.

**Neden:** Şablonun her yuvasına bağlanmış durum gürültüdür.

**Nasıl düzeltilir:** Önemli olduğu yerde bir kez söyleyin.

## Yazı ölçeği

### Yazı boyutu yalnız ölçekten

`type-scale` · hata · denetlenir

**Kural:** Temadaki ölçek kullanılır: text-2xs (11 px, en küçük), text-xs, text-sm, text-base … Elle text-[10px], text-[13px] yazılmaz.

**Neden:** Tek seferlik boyutlar ekranlar arasında küçük farklar biriktirir. 11 px altı metin okunmaz.

**Nasıl düzeltilir:** Temaya --text-2xs: 0.6875rem (satır yüksekliği 1rem) ekleyin; 9–11 px → text-2xs, 12 px → text-xs, 13 px → text-sm. Tanıtım sitesinin büyük başlık boyutları izin listesine yazılır.

### Başlıklar normal ile yarı kalın arası

`no-heavy-headings` · uyarı · denetlenir

**Kural:** Arayüz başlıklarında ve sayılarda font-extrabold ya da font-black (800–900) yok; hiyerarşi boyut ve konumdan gelir.

**Neden:** Üretilmiş ekranlar her başlığı olabildiğince kalın yapar, böylece hiçbiri öne çıkmaz.

**Nasıl düzeltilir:** 400–600 kullanın ve boyutu bir basamak büyütün. Kalın çizilmiş bir gösterim yazı tipi ayarda izinli yapılabilir.

### Vurgu italikle değil, kalınlık ya da renkle

`no-italic-emphasis` · not · denetlenir

**Kural:** Arayüz metni vurgu için italik yazılmaz; alıntı ve eser adı italik olabilir.

**Neden:** İtalik arayüz boyutlarında zor okunur ve yer tutucu gibi görünür.

**Nasıl düzeltilir:** font-medium ya da ikincil metin rengi kullanın.

### Küçük metinde dar harf aralığı yok

`no-tight-small-text` · uyarı · denetlenir

**Kural:** tracking-tight ve eksi harf aralığı büyük gösterim metnine (40 px ve üstü) aittir, text-base ve küçüğüne asla.

**Neden:** Sıkıştırılmış küçük harfler biçimini kaybeder, zor okunur.

**Nasıl düzeltilir:** Küçük metinde harf aralığını 0 bırakın; soluk açıklamada hafif artı olabilir.

### Satır aralığı sınıf birleştirmede kaybolmaz

`leading-survives-merge` · uyarı · denetlenir

**Kural:** cn() ya da twMerge() içinde leading-* sınıfı text-<boyut> sınıfından önce gelmez: boyutu satır aralığıyla yazın (text-xl/snug) ya da leading’i sonra koyun.

**Neden:** tailwind-merge yazı boyutunu satır aralığını da ayarlıyor sayar; cn('leading-snug', 'text-xl') leading-snug’ı sessizce siler, başlık 1,375 yerine 1,2 ile çizilir.

**Nasıl düzeltilir:** text-xl/snug yazın ya da leading-* sınıfını boyuttan sonraya alın.

### Metin sığsın diye küçültülmez

`no-shrunk-text` · uyarı · denetlenir

**Kural:** Gövde metni ve etiketler telefonda boyutunu korur (12 px altına inmez, masaüstünden küçük olmaz); yalnız büyük başlıklar küçülebilir.

**Neden:** Telefon kol mesafesinde ve güneş altında okunur; yerleşimi sığdırmak için yazıyı küçültmek sorunu okura yükler.

**Nasıl düzeltilir:** Boyutu koruyun, yerleşim esnesin: alta geçirin, üst üste dizin ya da ikincil içeriği aşağı alın.

### Dev yazı sayfada bir kez

`one-display-size` · uyarı · gözden geçirilir

**Kural:** Sayfada yalnız bir öğe diğerlerinden çok büyük olabilir ve bu bir sayı ya da kısa ifadedir. Bölüm başlıkları ortak ölçekte kalır, tanıtım sayfasında yaklaşık 32–48 px.

**Neden:** Büyüklük ancak karşıtlıkla etki yapar. Her bölüm bağırınca sayfa abartılı görünür, yazı da zor okunur.

**Nasıl düzeltilir:** Başlık boyutlarını değişken yapın, açık ekrandaki boyutları yazın, seçilen tek öğe dışındakileri ölçeğe indirin.

### Varsayılan değil, seçilmiş yazı tipi

`no-overused-font` · not · denetlenir

**Kural:** Ana yazı tipi, her üretilmiş sayfanın uzandığı yazı tiplerinden biri değildir (Inter, Roboto, Geist, Fraunces, Space Grotesk ve benzeri); marka kendi yazı tipi olarak seçtiyse başka.

**Neden:** Varsayılan yazı tipi, kimsenin karar vermediğini söyler.

**Nasıl düzeltilir:** system --character ile seçin; marka yazı tipiyse yapılandırmada izin verin.

### Başlıklar metnin üstünde durur

`flat-type-scale` · uyarı · denetlenir

**Kural:** En büyük başlık, gövde yazısının en az 1,25 katıdır.

**Neden:** Boyut basamağı yoksa göz nereden başlayacağını bilemez.

**Nasıl düzeltilir:** Sayfanın başına daha güçlü bir basamak ekleyin.

### Dev boyutta tam cümle yok

`no-giant-sentence` · uyarı · denetlenir

**Kural:** Sekiz kelime ya da daha uzun başlık 64 px altında ve ilk ekranın %60'ından kısa kalır.

**Neden:** İlk ekranı doldurur, sayfanın sunduğuna yer bırakmaz.

**Nasıl düzeltilir:** Başlığı kısaltın ya da boyutunu düşürün.

### İtalik serif ana başlık yok

`no-italic-serif-hero` · uyarı · denetlenir

**Kural:** Ana başlık, tamamı ya da vurgu için tek italik kelimesiyle, büyük italik serif yazılmaz.

**Neden:** Tek sayfada zarif görünür; üretilmiş açılış sayfalarının üniforması oldu.

**Nasıl düzeltilir:** Dik yazın; vurguyu kalınlık, konum ya da kelimelerle verin.

### Ezilmiş harf aralığı yok

`no-crushed-tracking` · uyarı · denetlenir

**Kural:** Harf aralığı -0,05em'in üzerinde kalır.

**Neden:** Bu sınırın ötesinde harfler biçimini kaybeder.

**Nasıl düzeltilir:** Büyük başlıkları az sıkıştırın.

### Akan metinde geniş harf aralığı yok

`no-wide-tracking-body` · uyarı · denetlenir

**Kural:** Küçük harfli akan metinde harf aralığı en çok 0,05em'dir; geniş aralık kısa büyük harfli etiketler içindir.

**Neden:** Kelime biçimlerini bozar, okumayı yavaşlatır.

**Nasıl düzeltilir:** Akan metinden harf aralığını kaldırın.

### Satırların yeri var

`no-tight-leading` · uyarı · denetlenir

**Kural:** 32 px altındaki çok satırlı metnin satır yüksekliği en az 1,3'tür.

**Neden:** Sıkışık satırda göz yerini kaybeder.

**Nasıl düzeltilir:** Akan metinde 1,5 ile 1,7 kullanın.

### Hecelemesiz iki yana yaslı metin yok

`no-justified-text` · uyarı · denetlenir

**Kural:** Heceleme açık değilse metin iki yana yaslanmaz.

**Neden:** Dar sütunda dikey beyaz nehirler oluşur.

**Nasıl düzeltilir:** Sola yaslayın ya da doğru lang ile hyphens: auto kullanın.

### Son satırda tek kelime yok

`no-straggler` · not · denetlenir

**Kural:** Paragraf son satırında tek kelimeyle bitmez.

**Neden:** Bloğun altında delik bırakır.

**Nasıl düzeltilir:** text-wrap: pretty kullanın.

### Başlıklar dengeli kırılır

`balanced-headings` · not · denetlenir

**Kural:** İki ya da daha çok satırlı başlık çok daha kısa bir satırla bitmez.

**Neden:** Başlığın altındaki yalnız kelime kaza gibi görünür.

**Nasıl düzeltilir:** text-wrap: balance kullanın ya da sığacak şekilde yeniden yazın.

### Minik yazı yok

`no-tiny-text` · uyarı · denetlenir

**Kural:** Yazı en az 12 px; bağlantı, düğme ve tablo hücresi en az 11 px'tir.

**Neden:** Bunun altı, ekran ne olursa olsun okunamazlıktır.

**Nasıl düzeltilir:** Ölçeğin en küçük basamağına çıkarın.

### Büyük harfle cümle yok

`no-all-caps-sentences` · uyarı · denetlenir

**Kural:** Sekiz kelime ya da daha uzun metin büyük harfle yazılmaz.

**Neden:** Kelimeleri biçiminden okuruz; büyük harf bunu siler.

**Nasıl düzeltilir:** Büyük harfi kısa etiketlere bırakın.

## Köşe ve yüzey

### Köşe yuvarlaklığı yalnız ölçekten

`radius-scale` · hata · denetlenir

**Kural:** rounded-md … rounded-3xl ve rounded-full kullanılır; tanıtım sitesinin büyük yüzeyleri tek bir ortak değer alır (rounded-panel). Elle köşe yalnız 5 px'e kadar mikro öğelerde ve cihaz/ikon çizimlerinde. CSS'te px köşe 6, 8, 12, 16, 20, 24 ya da 32 olur; 5'e kadar olanlar ile 999 ve üstü de geçer.

**Neden:** Yan yana 28, 30 ve 32 px'lik köşeler sistem değil gürültü gibi okunur.

**Nasıl düzeltilir:** En yakın ölçek adımını seçin ya da tek bir adlı değer ekleyin.

### Kart içinde kart yok

`no-nested-cards` · uyarı · denetlenir

**Kural:** Kartın içindeki gruplar boşluk, yazı ve ayraçla ayrılır; içe ikinci bir çerçeveli kart konmaz.

**Neden:** İç içe çerçeve anlamı olmayan derinlik ekler.

**Nasıl düzeltilir:** Düzleştirin: ikinci kenarlık ve gölge yerine ayraç ya da hafif zeminli blok.

### İç köşe dış köşeyi izler

`nested-radius` · uyarı · gözden geçirilir

**Kural:** Yuvarlak bir kabın içindeki öğe köşe = dış köşe − iç boşluk kullanır (4 px altına inmez); her öğe tam hap değildir.

**Neden:** İç ve dışta eşit köşe, köşelerde boşluğu düzensiz gösterir; her yerde hap, denetim ile kap arasındaki farkı siler.

**Nasıl düzeltilir:** 8 px boşluklu 16 px kart 8 px köşeli öğe taşır; tam hapı çip ve avatarlara bırakın.

### Kartlar ağır gölgeyle değil yüzey basamağıyla ayrılır

`no-heavy-card-shadow` · uyarı · denetlenir

**Kural:** Sayfa akışındaki kart ve paneller ince kenarlık ya da sayfadan bir basamak açık yüzey kullanır; shadow-lg ve üstü havada duran öğeler içindir (menü, iletişim kutusu, açılır panel).

**Neden:** İncelediğimiz yüksek puanlı panellerin hepsi kartları açık sayfa zemini ve beyaz ya da yükseltilmiş kartla ayırdı, gölge neredeyse yoktu; ağır gölge kart ızgarasını yapıştırma etiketler gibi gösterir.

**Nasıl düzeltilir:** Gölgeyi shadow-sm'e indirin ya da kaldırın, yüzeyi basamaklayın (sayfa gray-50, kart beyaz; koyu: sayfa #0b0d14, kart #11141c).

### Aynı düzeydeki yüzeylere tek köşe

`one-surface-radius` · uyarı · gözden geçirilir

**Kural:** Aynı düzeydeki kart ve görseller tek köşe değeri kullanır. Bir ekranda 9, 12, 12 ve 10 px gürültüdür; içeridekiler nested-radius kuralına uyar.

**Neden:** Her değer tek başına geçerlidir, ölçek denetimi yakalamaz; ama göz bu karışımı farklı yerlerden gelmiş parçalar olarak okur.

**Nasıl düzeltilir:** Açık ekrandaki yüzeylerin köşe değerlerini sayı olarak yazın. Her düzey için birini seçip değişkenle verin.

## Bileşen ve tekrar

### Etkileşimli öğeler ortak bileşenden

`use-shared-components` · uyarı · denetlenir

**Kural:** Sayfalar ortak Button, Input, Select, Textarea ve Checkbox bileşenlerini kullanır; ham <button>, <input>, <select>, <textarea> yazılmaz. Ham öğeler yalnız bileşen klasörünün içinde durur.

**Neden:** Her ham öğe düğmenin yeni bir kopyasıdır: bir yerde yükseklik, odak halkası ya da köşe farklı olur ve bir sonraki düzeltme onu kaçırır.

**Nasıl düzeltilir:** Bileşenle değiştirin; bileşende gereken görünüm yoksa görünümü bileşene ekleyin.

### Rozet, kutu, başlık ve düğme görünümlü bağlantı ortak bileşenden

`use-shared-looks` · uyarı · denetlenir

**Kural:** Rozet gibi biçimlenmiş span, kart gibi biçimlenmiş div, kendi boyut sınıflarını taşıyan başlık ya da düğme gibi biçimlenmiş bağlantı, ortak bileşenin elle yapılmış kopyasıdır. Rozet, kutu, başlık ve bağlantı düğmesi bileşenleri kullanılır; proje adlarını config.looks ile verir.

**Neden:** En hızlı dağılan şey rozet ve kutudur: aynı 'yeni' etiketi beş farklı boşluk ve dört farklı yeşille yazılır. Başlık ölçeği ancak başlıklar boyut yazmak yerine boyut seçtiğinde korunur.

**Nasıl düzeltilir:** Öğeyi bileşenle değiştirip ton ve boyut seçin; uyan yoksa çağrı yerine sınıf değil, bileşene ton ya da boyut ekleyin.

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

### Az ve sakin rozet

`no-badge-spam` · uyarı · gözden geçirilir

**Kural:** PRO, Yeni ve Beta rozetleri seyrek, yalnız metindir ve bir nedeni vardır; sayaç ve kısayol parlayan hap değil, düz metin ya da tuş görünümüdür.

**Neden:** Her satırdaki rozet anlamını yitirir ve menüye gürültü ekler.

**Nasıl düzeltilir:** Karar değiştiren yerde tek rozet bırakın; gerisini kaldırın.

### Tek durum sistemi

`status-system` · uyarı · gözden geçirilir

**Kural:** Durumlar nokta ve kelimeli küçük, hafif renkli haplardır ve tek bir ortak eşlemeden gelir (başarılı, bekliyor, başarısız, taslak); aynı durum her ekranda aynı renktir.

**Neden:** Durum rengi bir kez öğrenilir; "Bekliyor" bir tabloda turuncu, ötekinde maviyse kullanıcı renge hiç güvenmez.

**Nasıl düzeltilir:** Durum → ton eşlemesiyle tek bir StatusBadge oluşturun, her tablo ve kartta onu kullanın.

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

`readable-measure` · uyarı · denetlenir

**Kural:** Akan metin satırda yaklaşık 80 karakteri geçmez (max-w-prose / max-w-3xl), satır aralığı en az 1,3; başlığın üstündeki boşluk altındakinden büyüktür.

**Neden:** Uzun satırda göz bir sonraki satırın başını kaybeder.

**Nasıl düzeltilir:** Kartı değil paragrafı daraltın.

### Boşlukta ritim

`spacing-rhythm` · not · denetlenir

**Kural:** İlgili öğeler sıkı, bölümler arası geniş; aynı düzeydeki boşluklar tek değerdir. Bölümler arasında 16, 20, 17 ve 21 px gürültüdür, ritim değildir.

**Neden:** Gruplama her şeyden önce boşluktan okunur; aynı düzeydeki eşitsiz boşluklar, üretilmiş ekranların kimsenin adını koyamadığı plansız hissini verir.

**Nasıl düzeltilir:** İki üç adım kullanın: grup içi, gruplar arası, bölümler arası. Ekranı açıp bloklar arası boşlukları sayı olarak yazın ve her düzeyi tek değere indirin.

### Boşluklar projenin ölçeğinde

`spacing-scale` · uyarı · denetlenir

**Kural:** Piksel cinsinden keyfi boşluk ve boyutlar (mt-[13px], h-[31px], gap-[7px]; CSS'te margin, padding, gap ve konum değerleri) projenin ölçeğine oturur: ai-design-check.json'daki, yoksa Tailwind'den, Bootstrap'in $spacer ve $spacers değerlerinden ya da CSS değişkenlerinden okunan, o da yoksa 4 px ızgarası. Uygulama kodu (SwiftUI, Compose, Flutter, React Native) yapılandırma dosyasını ya da 4 pt/dp kullanır. Tema basamakları tercih edilir.

**Neden:** Izgara dışı değerler modelin tahmin ederken yazdığı değerlerdir; satır ve aralıklar bir iki piksel kayar, ekran düzensiz görünür.

**Nasıl düzeltilir:** En yakın tema basamağına yuvarlayın (mt-3, h-8, gap-2). Değer bilinçliyse ve rapordaki ölçek yanlışsa ai-design-check.json içinde "spacing" ayarlayın.

### Kahraman alanında tek ana işlem

`hero-one-action` · uyarı · gözden geçirilir

**Kural:** Kahraman alanında bir ana ve en çok bir ikincil işlem olur; üçüncü düğme, düğmelerin altına yığılmış çip ya da avatar sırası yok.

**Neden:** Her ek işlem, ziyaretçinin kalıp kalmayacağına karar verdiği anda dikkati böler.

**Nasıl düzeltilir:** Ana işlemi ve bir alternatifi tutun; gerisini sayfanın aşağısına taşıyın.

### Tek kart başlığı düzeni

`card-header-pattern` · uyarı · gözden geçirilir

**Kural:** Her kart başlığı aynıdır: solda başlık, sağda en çok bir denetim (dönem seçici, "Tümünü gör" ya da ⋯ menüsü), aynı taban çizgisinde.

**Neden:** Kartlarda tek başlık düzenini tekrarlamak yoğun paneli sakin gösteren şeydir; karışık başlıklar her kartı yeni bir okuma işi yapar.

**Nasıl düzeltilir:** Başlık ve isteğe bağlı işlem yuvası olan bir CardHeader bileşeni çıkarıp her yerde kullanın.

### Sayfa başına tek ana işlem

`one-primary-action` · uyarı · gözden geçirilir

**Kural:** Sayfa başlığında tek dolu ana düğme olur (genelde sağ üstte); diğer işlemler ikincil, hayalet ya da menü içindedir.

**Neden:** Yan yana iki dolu düğme, kullanıcıdan sayfanın ne için olduğunu anlamadan seçim yapmasını ister.

**Nasıl düzeltilir:** Sayfanın işini ilerleten işlemi dolu bırakın; gerisini bir basamak indirin.

### Telefonda yana kaydırma yok

`no-horizontal-overflow` · hata · denetlenir

**Kural:** 320 px'te sayfa ekrandan geniş değildir. Geniş içerik (tablo, kod bloğu) sayfa değil kendi kutusu içinde kayar.

**Neden:** Yana kayan sayfa sağ kenarını saklar ve her dikey kaydırmayı yalpalatır.

**Nasıl düzeltilir:** Satırların alta geçmesine izin verin (flex-wrap), uzun kelimeleri bölün (doğru lang ile hyphens: auto, overflow-wrap), geniş tabloyu overflow-x-auto içine alın.

### İçerik kendi sütununda kalır

`cell-holds-content` · uyarı · denetlenir

**Kural:** Izgara ya da flex hücresinin içindeki hiçbir şey yandaki hücrenin üstüne taşmaz. Kısaltılan (truncate) satırı tutan flex ya da ızgara öğesinde min-w-0 (min-width: 0) ya da overflow hidden bulunur; böylece kesilen satır olur, düzen değil.

**Neden:** Flex öğesi varsayılan olarak içeriğinden dar olamaz; truncate satırındaki tek bir uzun ad kartı sütunundan taşırıp komşusunun üstüne çıkarır, sütun ise doğru görünür.

**Nasıl düzeltilir:** Hücre ile kısaltılan metin arasındaki her flex ya da ızgara öğesine min-w-0 ekleyin (ya da hücreye overflow-hidden).

### Telefon aynı içeriği alır

`no-hidden-content-narrow` · not · denetlenir

**Kural:** Masaüstünde görünen metin telefonda gizlenmez (hidden sm:block). Öğeler bir dokunuş uzakta kaldıkça daraltılmış menü sorun değildir.

**Neden:** Küçük yerleşimi çalıştırmak için içerik gizlemek ziyaretçilerin çoğundan bilgiyi saklar.

**Nasıl düzeltilir:** Gösterin, herkes için kısaltın ya da gizlemek yerine sayfada aşağı taşıyın.

### Telefonda her hücreye yer

`phone-row-room` · uyarı · gözden geçirilir

**Kural:** Telefonda bir satır, etiketini ve değerini normal boyutta gösterebilecek kadar hücre alır; çoğunlukla iki. Yan yana beş küçük gösterge alta geçip ızgara olur; hiçbiri atılmaz.

**Neden:** Masaüstü satırını 390 px'e sıkıştırınca etiketler 9 px'e düşer, sayılar karşılaştırılamaz.

**Nasıl düzeltilir:** 2×2 ya da 2×3 ızgara kullanın; her hücreye etiket, değer ve gerekiyorsa tek gösterge verin.

### Ekran başlığı tek iş yapar

`trim-screen-header` · not · gözden geçirilir

**Kural:** Telefonda başlık tek satır kimlik ve en çok iki denetimden oluşur. Ortada uygulama adı, alt yazı, menü, hesap düğmesi ve içerik üstünde selamlama cümlesi dört ayrı başlıktır.

**Neden:** Üst üste gelen başlıklar ilk işe yarar şeyi ekranın ortasının altına iter ve kişinin zaten bildiğini tekrarlar.

**Nasıl düzeltilir:** Selamlamayı ya da adı bırakın, ikisini değil; ekranın ne işe yaradığını anlatan cümle gider. Kalan denetimleri aynı satıra alın.

### Yan yana olanlar aynı hizada

`measure-alignment` · uyarı · gözden geçirilir

**Kural:** Bir satırdaki yazı, sayı ve düğmeler ortak orta çizgide ya da taban çizgisindedir. Açık ekranda sayıyla kontrol edin; büyük sayı ile düğme arasındaki birkaç piksel bile göze batar.

**Neden:** Hizasızlık hata gibi görünür; çoğunlukla bir öğenin üstüne eklenen etiket buna yol açar.

**Nasıl düzeltilir:** Etiketli bloğu değil, değerin kendisini düğmeyle hizalayın; sonra iki orta çizgiyi ölçün.

### Kardeş kartlar aynı biçimde biter

`card-footer-pattern` · uyarı · gözden geçirilir

**Kural:** Yan yana kartlarda etiket ve işlem aynı yerde olur: etiketler metnin hemen altında, işlem alt kenarda aynı tarafta. Uzun içerik onları yerinden oynatmaz.

**Neden:** Alta geçen etiketler işlemleri her kartta başka yere iter ve sıra bir bütün gibi okunmaz.

**Nasıl düzeltilir:** Kartı sütun yapın, işlem satırını alta sabitleyin, etiketler onun üstünde alta geçsin.

### Sütunlar birlikte biter

`balance-columns` · not · gözden geçirilir

**Kural:** Yan yana iki sütun yaklaşık aynı yükseklikte biter; devamı olan liste tümüne bağlantı verir.

**Neden:** Yanındakini geçen liste bitmemiş görünür; bağlantısız kısaltılmış liste de gerisini saklar.

**Nasıl düzeltilir:** Ana öğenin yanına sığacak kadar öğe gösterin, altına tam listeye giden bağlantı ekleyin.

### Tam yükseklik telefonun çubuklarına uyar

`dynamic-viewport-height` · uyarı · denetlenir

**Kural:** 100vh sabit yüksekliğinin dvh ya da svh karşılığı vardır. Telefonda vh tarayıcı çubuklarının altındaki alanı da sayar. min-height sorun değildir: sayfa biraz daha fazla kayar.

**Neden:** Ekranın altı adres çubuğunun altında kalır: çoğu zaman tanıtım alanının ana düğmesi ya da sohbetin giriş kutusu.

**Nasıl düzeltilir:** h-dvh ya da min-h-svh; CSS'te height: 100vh; height: 100dvh; yazın, eski tarayıcıda da değer kalsın.

### Kartlar kaydırıcı kenarına değmez

`no-flush-cards` · uyarı · denetlenir

**Kural:** Yatay kaydırıcıdaki kartlar durağan hâlde kenar boşluğu bırakır.

**Neden:** Kenarları ve köşeleri kesilir.

**Nasıl düzeltilir:** Kaydırıcıya iç boşluk verin, scroll-padding ile eşleştirin.

### İlk ekrandaki sütunlar yakın kalır

`no-lopsided-fold` · not · denetlenir

**Kural:** Başlığın yanındaki sütun, komşusu tek ekrana sığarken ekranın çok altına uzamaz.

**Neden:** Kısa sütun boşlukta asılı kalır.

**Nasıl düzeltilir:** Dengeleyin ya da alt alta alın.

### Kutu içinde yer

`no-cramped-padding` · uyarı · denetlenir

**Kural:** Dolgulu ya da çerçeveli kutudaki metin kenardan en az 3 px uzak durur.

**Neden:** Kutuya değen metin hata gibi görünür ve zor okunur.

**Nasıl düzeltilir:** Ölçekten iç boşluk ekleyin.

### Metin ekran kenarından uzak durur

`text-off-viewport-edge` · uyarı · denetlenir

**Kural:** Paragraflar ekran kenarından 16 px, telefonda 12 px uzak durur.

**Neden:** Kenara yapışık metin zor okunur, bitmemiş görünür.

**Nasıl düzeltilir:** Yan boşluklu bir kaba alın.

### Başlık tanıttığı içeriğe yakın durur

`heading-spacing` · not · denetlenir

**Kural:** Başlığın üstündeki boşluk altındakinden büyüktür.

**Neden:** Yoksa önceki bloğa aitmiş gibi görünür.

**Nasıl düzeltilir:** Başlığın altındaki boşluğu üstüne taşıyın.

### Varsayılan karşılama şablonu değil

`no-centred-hero-cards` · not · denetlenir

**Kural:** İlk ekran, yanında görsel olmayan ortalı bir başlık ve hemen ardından gelen üç ya da dört eşit kartlık bir sıra değildir.

**Neden:** Her üretecin ve şablonun başladığı biçimdir; bu ürün hakkında hiçbir şey söylemez.

**Nasıl düzeltilir:** Yerleşimi ilk ekranın gösterdiğinden seçin: ürünle bölünmüş ekran, gerçek bir fotoğraf, bir mekân, editoryal bir sütun. İçerikleri farklıysa kartlar da farklı olsun.

### Kırpan kutu içindekini kesmez

`no-clipped-popover` · not · denetlenir

**Kural:** overflow hidden kutusu menü ya da ipucu gibi konumlandırılmış çocuğu kesmez.

**Neden:** Menü ve ipuçları kutusundan taşabilmelidir.

**Nasıl düzeltilir:** Taşmaya izin verin ya da katmanı dışarı alın.

## Menü

### Menü işe göre, yer önce kararlaştırılır

`menu-by-job` · uyarı · gözden geçirilir

**Kural:** Özellik yazılmadan önce yeri kararlaştırılır: hangi menü bölümü, ayrı satır mı var olan sayfanın sekmesi mi, hangi adres öneki. Aynı işin sayfaları menüde tek satır, sayfada sekmedir. Bölümler katlanır; içinde bulunulan bölüm açık kalır.

**Neden:** Yoksa menü, birbiriyle ilgili işlerin dört ayrı yere düştüğü elli satırlık düz bir listeye dönüşür.

**Nasıl düzeltilir:** Taşınan adres 301 ile yönlenir (alt yol ve sorgu korunur); dış servislere kayıtlı geri dönüş adresleri taşınmaz. Yardım metinlerindeki "nerede" yolu menüyle aynı yazılır.

### Ana işlem sekme değildir

`main-action-apart-from-tabs` · not · gözden geçirilir

**Kural:** Ana işlem sekmelerin ortasından taşmaz, onlardan ayrı durur. İçeriğin üstünde yüzen çubuk içeriğe yer bırakır: son satır her zaman açığa kaydırılabilir.

**Neden:** Beş etiketli sekmenin ortasından taşan düğme her üretilmiş uygulamanın varsayılanıdır; payı olmayan yüzen çubuk da son öğeyi gizler.

**Nasıl düzeltilir:** İşlemi çubuğun yanında ya da ekranda kendi düğmesine alın; yüzen çubuk yüksekliğinde alt boşluk ekleyin. Gereken sekmelerde dokunma alanı ve etiket kalsın.

## Görsel dil

### Emoji yerine çizgi ikon

`icons-not-emoji` · uyarı · denetlenir

**Kural:** Arayüz işaretleri tek bir setten çizgi ikondur (lucide). Emoji ve ✓ gibi metin işaretleri süs olarak kullanılmaz; içerik olan emoji (sohbet emoji seçici) kalır.

**Neden:** Emoji her platformda farklı çizilir ve üretilmiş gibi okunur.

**Nasıl düzeltilir:** Metin boyutunda karşılık gelen ikonla değiştirin.

### Gradyan metin ve mor gradyan yok

`no-ai-gradients` · uyarı · denetlenir

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

`legible-contrast` · uyarı · denetlenir

**Kural:** Metin WCAG AA'yı karşılar (4,5:1, büyük metin 3:1); renkli zeminde gri metin yok.

**Neden:** Renkli zeminde gri soluk görünür ve güneş altında okunmaz.

**Nasıl düzeltilir:** Zemin renginin koyu tonunu ya da beyaza yakın rengi kullanın.

### Bağlantının her zemin için rengi var

`link-token-per-surface` · uyarı · denetlenir

**Kural:** Hem açık hem koyu zeminde kullanılan bağlantı rengi ikisinde de 4,5:1’i geçer; tek değer geçemiyorsa açık ve koyu zemin kendi bağlantı değerini alır.

**Neden:** Koyu bantta okunan marka turuncusu beyazda 2,5:1 kalır: iki zemine yayılan tek token mutlaka birinde kalır.

**Nasıl düzeltilir:** Açık zeminde bağlantıya koyu ton (700), koyu bölümde açık ton (400); zemine göre ayrı token ya da koyu bölüm yardımcısıyla.

### Her başlığın üstünde ikon kutusu yok

`no-icon-tile-stack` · uyarı · denetlenir

**Kural:** Her birinde yuvarlak ikon kutusu, başlık ve iki satır metin olan aynı kartlardan ızgara bir şablondur, yerleşim değildir. İkonu satır içinde kullanın ya da hiç kullanmayın; öne çıkanı değiştirin.

**Neden:** Her üreticinin varsayılan çıktısıdır ve ürün hakkında hiçbir şey söylemez.

**Nasıl düzeltilir:** İkon yerine gerçek içerikle başlayın (bir sayı, bir ekran görüntüsü, bir örnek).

### Başlık üstünde duyuru hapı yok

`no-announcement-pill` · uyarı · denetlenir

**Kural:** Kahraman başlığının üstünde küçük hap ya da rozet ("✨ Introducing X 2.0", "Şimdi betada") yok; gerçek ve yeni bir habere gidiyorsa sade bir metin bağlantısıdır.

**Neden:** En çok kopyalanan kahraman kalıbıdır; göz başlıktan önce ona takılır ve bir şey bulamaz.

**Nasıl düzeltilir:** Kaldırın ya da tarihli düz bir bağlantıya çevirin.

### Başlıkta renkle ayrılmış kelime yok

`no-accent-word` · not · denetlenir

**Kural:** Ana başlık tek renktir: hiçbir kelime ya da kısa söz öbeği vurgu rengiyle ya da gradyan metinle ayrılmaz.

**Neden:** Üretilmiş sayfaların en çok tekrarlanan kahraman tarifidir: ölçtüğümüz 12 üretilmiş sayfanın 8'inde, 12 tasarlanmış sayfanın 1'inde vardı.

**Nasıl düzeltilir:** Başlığı tek renkle yazın; vurguyu kelimeler taşısın.

### Renkli gölge yok

`no-colored-shadow` · not · denetlenir

**Kural:** Kart, düğme ve görseller nötr gölge düşürür; gölge marka ya da vurgu rengine boyanmaz.

**Neden:** Ölçtüğümüz 12 üretilmiş sayfanın 8'inde renkli gölge vardı, 12 tasarlanmış sayfanın hiçbirinde yoktu; derinlik değil parıltı gibi okunur.

**Nasıl düzeltilir:** Nötr gölge (düşük opaklıkta siyah) ya da kenarlık kullanın; rengi dolguya saklayın.

### Yapay zekâ için ışıltı ikonu yok

`no-sparkle-for-ai` · not · denetlenir

**Kural:** Her yapay zekâ özelliği ışıltıyla işaretlenmez; işlemin ne yaptığını söyleyen ikonu (yaz, özetle, çevir) kullanın ya da hiç kullanmayın.

**Neden:** Işıltı her yapay zekâ ürününde var; düğme hakkında kullanıcıya hiçbir şey söylemez.

**Nasıl düzeltilir:** Fiil ikonuyla (PenLine, ListChecks, Languages) ya da yalnız metinle değiştirin.

### İçeriğin arkasında bulanık renk lekesi yok

`no-blur-blobs` · uyarı · denetlenir

**Kural:** Metin ve kartların arkasında süs olarak büyük bulanık şekil (blur-2xl, blur-3xl) ya da radyal renk lekesi yok.

**Neden:** Leke, üretilmiş sayfaların varsayılan arka planıdır; kontrastı düşürür ve ürün hakkında bir şey söylemez.

**Nasıl düzeltilir:** Tek düz yüzey kullanın ya da görsel olarak gerçek bir ürün ekranı koyun.

### Tek vurgu rengi, anlamı olduğu yerde

`one-accent` · uyarı · gözden geçirilir

**Kural:** Vurgu rengi ekranın küçük bir bölümünü kaplar: ana işlem, seçim ve bir önemli sayı. Yüzey, kenarlık ve etiketler nötr kalır.

**Neden:** Her şey vurgulanınca hiçbir şey öne çıkmaz; ekran gözün ineceği tek yeri kaybeder.

**Nasıl düzeltilir:** Ekran görüntüsünde vurguyu sayın; çerçeveden alıp önemli olan tek şeye taşıyın.

### Genel görsel değil, ürünü gösterin

`show-the-product` · uyarı · gözden geçirilir

**Kural:** Ana görsel ürünün kendisi ya da dünyasından somut bir nesnedir; parlak leke, küre, robot, parlayan beyin ya da hazır devre görseli yok.

**Neden:** Genel görsel her ürün sayfasına konabilir; hiçbir şey anlatmaz ve sayfayı şablon gibi gösterir.

**Nasıl düzeltilir:** Gerçek veriyle gerçek bir ekran ya da ürünün ne yaptığını söyleyen bir nesne kullanın.

### Düğmeler düz renk, gradyan dolgu yok

`no-gradient-buttons` · uyarı · denetlenir

**Kural:** Düğme ve düğme görünümlü bağlantılar temadan tek düz renk kullanır; "Yapay zekâya sor" düğmesi dahil gradyan zemin yok.

**Neden:** İncelediğimiz panellerde en güçlü işler düz ana düğme kullandı; gradyan düğme zayıf işlerin yapay zekâ özelliklerinde çıktı ve ana işlem değil süs gibi okundu.

**Nasıl düzeltilir:** Ana rengi düz dolgu olarak kullanın; yapay zekâ işlemini gradyanla değil fiille belirtin.

### Akışı fotoğraflar taşısın

`content-is-the-surface` · not · gözden geçirilir

**Kural:** Fotoğraflı akışta yüzey fotoğrafın kendisidir: her gönderinin çevresinde kutu, kart içinde küçük görsel, her satırda pastel rozet yoktur.

**Neden:** Her gönderinin çevresindeki kart genişliği çerçeveye harcar ve tüm içeriği aynı derecede önemsiz gösterir.

**Nasıl düzeltilir:** Kartı kaldırın, görsel genişliği alsın, gönderileri boşlukla ayırın.

### Marka renginde yazı rengi korunur

`keep-text-on-brand` · uyarı · gözden geçirilir

**Kural:** Marka rengi bant ya da düğme üstündeki yazı markanın kullandığı gibi kalır, çoğunlukla beyaz. Kontrast sayısı onu siyaha çevirmez; oranı bildirin, kararı sahibi versin.

**Neden:** İnsanlar renk değişimini, oranı fark etmeden çok önce başka bir marka gibi algılar.

**Nasıl düzeltilir:** Yazı rengini koruyun. Küçük yazı zayıf kalıyorsa büyütün ya da kalınlaştırın, veya bandın daha koyu tonunu önerin.

### İşe yarayanı koruyun

`keep-what-works` · uyarı · gözden geçirilir

**Kural:** Değiştirmeden önce sitenin doğru yaptığı ayrıntıları listeleyin: ayırıcılar, ikonlar, arka plan hareketi, menüler. Birini kaldırmak için söylenebilir bir gerekçe gerekir.

**Neden:** Küçük tanıdık ayrıntıları silen yeniden tasarım, her yeni parça daha iyi olsa da daha kötü hissettirir; sahipler de önce bunları fark eder.

**Nasıl düzeltilir:** Eski ve yeni ekranı, menüler ve açık hallerle birlikte yan yana koyun; gerekçesiz kaybolanı geri getirin.

### Varsayılan değil, seçilmiş zemin

`no-default-cream` · uyarı · denetlenir

**Kural:** Sayfa zemini, üretilmiş sayfaların refleksle seçtiği sıcak krem ya da bej değildir. Küçük krem alanlar sorun değil; tüm sayfa için gerekçe gerekir.

**Neden:** Yeni güvenli varsayılan oldu; beyazın eskiden söylediği kadar az şey söylüyor.

**Nasıl düzeltilir:** Zemini markadan alın; marka gerçekten o renkse koruyun.

### Koyu zeminde neon camgöbeği yok

`no-neon-on-dark` · uyarı · denetlenir

**Kural:** Neredeyse siyah zeminde doygun camgöbeği yazı en çok bir kez kullanılır.

**Neden:** Mor geçişlerle birlikte en tanınan üretilmiş paletlerden biridir.

**Nasıl düzeltilir:** Marka vurgusunu ya da yazı için açık nötr rengi kullanın.

### Numaralı bölüm etiketi yok

`no-section-numbers` · not · denetlenir

**Kural:** Sıra önemli değilse küçük 01, 02, 03 etiketleri bölüm başlıklarının yanında durmaz.

**Neden:** Sayfa yapısını kurmak yerine kendi bölümlerini numaralıyor.

**Nasıl düzeltilir:** Kaldırın; numarayı gerçek adımlara saklayın.

### Tüm satırda ince çizgi ve geniş gölge yok

`no-border-and-wide-shadow` · not · denetlenir

**Kural:** Bir kart satırının tamamı ince çizgi ve geniş yayılan gölge taşımaz. Tek yüzen panel taşıyabilir.

**Neden:** Tüm satırda karar değil varsayılandır.

**Nasıl düzeltilir:** Çizgiyi ya da gölgeyi koruyun, ikisini birden değil.

### İçeriğin arkasında dairesel parıltı yok

`no-radial-halo` · not · denetlenir

**Kural:** Saydama doğru solan doygun dairesel geçiş, arka planda spot ışığı ya da bulut olarak kullanılmaz.

**Neden:** Parıltılı gölgenin geçiş hâlidir, metnin üstünde süzülür.

**Nasıl düzeltilir:** Kaldırın; bölüme paletten düz zemin verin.

### Süs amaçlı çizgili yüzey yok

`no-stripe-surface` · not · denetlenir

**Kural:** Tekrarlanan geçişli çizgiler yüzey süsü olarak kullanılmaz.

**Neden:** Sık görülen üretilmiş imzadır.

**Nasıl düzeltilir:** Yüzeyi düz bırakın ya da bilinçli doku kullanın.

### Izgara çizgili duvar kâğıdı yok

`no-grid-wallpaper` · not · denetlenir

**Kural:** İki geçişten döşenen ince çizgili ızgara arka plan olmaz; ürün tuval, harita ya da plan değilse.

**Neden:** Teknik itibar ödünç alır, bir şey katmaz.

**Nasıl düzeltilir:** Kaldırın.

### clip-path ile çizilmiş yırtık kenar yok

`no-blob-clip-path` · not · denetlenir

**Kural:** Çok köşeli ya da eğri clip-path; damla, yırtık kenar ya da silueti taklit etmez.

**Neden:** Efektin ucuz sürümü gibi görünür.

**Nasıl düzeltilir:** Gerçek görsel ya da temiz kenar kullanın.

### Örtü altında kalan görsel yok

`no-buried-image` · uyarı · denetlenir

**Kural:** Arka plan görseli neredeyse opak geçiş altında, görsel de neredeyse sıfır saydamlıkta olmaz.

**Neden:** Ekrana hiç ulaşmaz ama yüklenir, zaman harcar.

**Nasıl düzeltilir:** Düzgün gösterin ya da kaldırın.

### Sert kaymalı gölge bir karardır

`no-hard-offset-shadow` · not · denetlenir

**Kural:** Bulanıklığı olmayan, 4 px ya da daha çok kaymış gölge yalnız bilinçli yeni-brütalist yöne uyar.

**Neden:** O yön yoksa ödünç alınmış görünür.

**Nasıl düzeltilir:** Tasarıma uyduğunu kontrol edin; uymuyorsa yumuşatın ya da kaldırın.

### Şekillerden kurulu çizim parçası yok

`no-clipart-svg` · not · denetlenir

**Kural:** Büyük satır içi SVG, yığınla basit şekilden sahne kurmaz. Şemalar, veri ve ürünün nasıl çalıştığını gösteren çizimler sorun değildir.

**Neden:** Çizim değil, yer tutucu sanat gibi görünür.

**Nasıl düzeltilir:** Gerçek bir şey gösterin ya da ürünün yaptığını çizip etiketleyin.

### Kırık görsel yok

`image-not-broken` · hata · denetlenir

**Kural:** Her görsel yüklenir; hiçbirinin kaynağı boş ya da yer tutucu değildir.

**Neden:** Kırık kutu sayfanın kalanını boşa çıkarır.

**Nasıl düzeltilir:** Gerçek görsel kullanın ya da etiketi kaldırın.

### İçerik durağan hâlde görünür

`no-invisible-content` · hata · denetlenir

**Kural:** Tüm gösterimler çalıştıktan sonra metnin beşte birinden fazlası sıfır saydamlıkta kalmaz.

**Neden:** Bu, başarısız gösterimdir: içerik yayında ama kimse göremiyor.

**Nasıl düzeltilir:** Görünür hâli varsayılan yapın, ona doğru canlandırın.

### Metnin üstünü hiçbir şey kapatmaz

`text-not-covered` · hata · denetlenir

**Kural:** Metnin üstüne opak bir öğe boyanmaz.

**Neden:** Kutu altındaki kelimeler okunamaz.

**Nasıl düzeltilir:** Katmanı metnin yanına alın ya da sıralamasını düzeltin.

### Renkli zeminde gri yazı yok

`no-gray-on-color` · uyarı · denetlenir

**Kural:** Renkli zemindeki yazı nötr gri olmaz.

**Neden:** Oran geçse bile soluk görünür.

**Nasıl düzeltilir:** Beyaz ya da zeminin açık tonunu kullanın.

### Sayfa kendi tasarım sistemini kullanır

`design-system-drift` · not · denetlenir

**Kural:** Yapılandırmada "designSystem" (fonts, sizes, radii, colors) varsa sayfa bu listelerin dışına çıkmaz.

**Neden:** Küçük sapmalar bir sistemin sistem olmaktan çıkma biçimidir.

**Nasıl düzeltilir:** Listedeki değeri kullanın ya da yenisini bilerek ekleyin.

## Erişilebilirlik

### Dinamik yazı boyutuna uyan metin stilleri

`dynamic-type` · uyarı · denetlenir

**Kural:** SwiftUI'da metni metin stilleriyle (.body, .headline, .caption) ya da relativeTo ile özel yazı tipiyle verin, sabit .system(size:) ile değil. İkonlar sabit boyut kullanabilir.

**Neden:** Sabit boyut, kullanıcının yazı boyutu ayarını yok sayar: büyük yazıya ihtiyacı olan ekranı okuyamaz ve her ekran kendi gelişigüzel boyutlarına sahip olur.

**Nasıl düzeltilir:** Her boyutu en yakın metin stiline eşleyin (11 caption2, 12 caption, 13 footnote, 15 subheadline, 17 body, 20 title3, 22 title2, 28 title, 34 largeTitle) ve kalınlığı .fontWeight ile verin.

### Parmağa yetecek dokunma alanı

`tap-target` · uyarı · denetlenir

**Kural:** Dokunulabilen her şey iOS'ta en az 44×44 pt, Android'de 48×48 dp, web'de 24×24 px'tir (olabildiğince 44 px). Küçük ikon boyutunu korur; çevresindeki alan büyür.

**Neden:** Küçük hedef ıskalanır ve yanındakine basılır; özellikle iri parmaklı, eli titreyen ya da hareket eden otobüste tek eliyle kullanan kişilerde. Apple, Material ve WCAG 2.2 (2.5.8) bir alt sınır koyar.

**Nasıl düzeltilir:** SwiftUI: ikonun çerçevesini koruyup .frame(minWidth: 44, minHeight: 44) ya da dolgu ekleyin, ardından .contentShape(Rectangle()). Compose: IconButton (48 dp) ya da Modifier.minimumInteractiveComponentSize() kullanın; .size()'ı tıklanan öğeye değil dolgudan sonraya koyun. Web: ikon düğmelerinde size-11/h-11 ya da ikonun çevresinde dolgu.

### Odak halkası yerine yenisi konmadan kaldırılmaz

`focus-ring-removed` · hata · denetlenir

**Kural:** outline-none / outline-hidden yalnız aynı öğede görünür bir focus-visible biçimiyle (ring, outline ya da border) birlikte kullanılır. CSS'te outline: none yalnız aynı kuralda box-shadow, border ya da outline ya da bir :focus-visible kuralı varsa yazılır; Bootstrap'te .btn ya da .form-control üzerindeki shadow-none için focus-ring gerekir.

**Neden:** Klavye kullanan kişi nerede olduğunu kaybeder. WCAG 2.4.7 (görünür odak), 2.4.11 (odak gizlenmez).

**Nasıl düzeltilir:** focus-visible:ring-2 (ya da bileşenin odak biçimini) ekleyin; Tailwind 4'te outline-none yerine outline-hidden kullanın, zorlanmış renk kipinde çerçeve kalsın. Odağı programla alan diyalog ve açılır pencere kapsayıcıları muaftır.

### Yalnız ikonlu düğmenin adı vardır

`icon-button-name` · hata · denetlenir

**Kural:** Yalnız ikon gösteren düğme ya da bağlantı aria-label (ya da title veya görünmeyen metin) taşır.

**Neden:** Ekran okuyucu amacı olmadan yalnız "düğme" der; WCAG 4.1.2 ad, rol, değer.

**Nasıl düzeltilir:** Eylemi söyleyen bir aria-label ekleyin ("Kelimeyi sil").

### İki parmakla yakınlaştırma açık kalır

`no-zoom-lock` · hata · denetlenir

**Kural:** Viewport user-scalable=no ya da 2'nin altında maximum-scale içermez.

**Neden:** Az gören kullanıcı okumak için yakınlaştırır; kilitli sayfada başka yolu kalmaz. WCAG 1.4.4.

**Nasıl düzeltilir:** Yalnız width=device-width, initial-scale=1 yazın. Alan odakta yakınlaşıyorsa alanı düzeltin (input-text-16).

### Telefonda alan yazısı 16 px

`input-text-16` · uyarı · denetlenir

**Kural:** Giriş, metin ve seçim alanları telefon genişliğinde en az 16 px yazı kullanır; küçük boyut daha geniş kırılımda başlayabilir.

**Neden:** iOS Safari daha küçük yazılı alana odaklanınca tüm sayfayı yakınlaştırır ve öyle bırakır.

**Nasıl düzeltilir:** text-base sm:text-sm ya da font-size: 16px; küçük boyut @media (min-width: …) içinde. Bunun yerine yakınlaştırmayı kilitlemeyin.

### Hiçbir şey fareyle üzerine gelene kadar gizli değil

`no-hover-only-content` · uyarı · denetlenir

**Kural:** Fareyle üzerine gelince görünen işlem ve bilgiler dokunmatik ekranda baştan görünür.

**Neden:** Parmağın üzerine gelme durumu yoktur; o düğme o kişi için hiç yoktur.

**Nasıl düzeltilir:** Yalnız geniş kırılımdan sonra gizleyin: opacity-100 md:opacity-0 md:group-hover:opacity-100; klavye için focus-within ekleyin.

### Başlık düzeyi atlanmaz

`heading-order` · uyarı · denetlenir

**Kural:** Başlıklar birer düzey iner: h1'den sonra h3 gelmez.

**Neden:** Ekran okuyucular bu yapıyla gezinir.

**Nasıl düzeltilir:** Düzeyi düzeltin, görünümü CSS ile verin.

## Hareket

### Nabız yalnız canlı veride

`pulse-for-live-only` · not · denetlenir

**Kural:** Nabız atan nokta şu an süren bir işi anlatır; süs için atmaz.

**Neden:** Sahte canlılık gerçek uyarıları görmezden gelmeyi öğretir.

**Nasıl düzeltilir:** Animasyonu süren duruma bağlayın; değilse sabit nokta gösterin.

### Kendiliğinden kayan şerit yok

`no-marquee` · not · denetlenir

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

### Üzerine gelince büyüme yok

`no-hover-scale` · uyarı · denetlenir

**Kural:** Kart ve düğmeler üzerine gelince büyümez; üzerine gelme renk ya da yüzey değiştirir, basınca hafifçe küçülebilir (0,97–0,98).

**Neden:** Büyüyen öğe komşularını görsel olarak iter, yazıyı bulanıklaştırır ve şablon efekti gibi durur.

**Nasıl düzeltilir:** hover:scale-105 yerine zemin ya da kenarlık basamağı; basma geri bildirimi için active:scale-[0.98].

### Konum değil, transform ve opacity canlandırılır

`no-layout-animation` · uyarı · denetlenir

**Kural:** Geçişler top, left, right, bottom, margin ya da padding canlandırmaz; hareket transform ile yapılır. İlerleme çubuğunda genişlik serbesttir.

**Neden:** Konum ve boşluk değişimi her karede yerleşimi yeniden hesaplatır, yavaş cihazda takılır.

**Nasıl düzeltilir:** translate ve opacity kullanın (transition-transform, transition-opacity).

### Arayüz 300 ms içinde yanıt verir

`interface-speed` · not · denetlenir

**Kural:** Üzerine gelme, basma, açma ve kapama geçişleri en çok 300 ms sürer. Tanıtım sayfasındaki girişler ve sahneler daha uzun olabilir.

**Neden:** İnsanlar bu işlemleri tekrar eder; yavaş yanıt, ilk seferde ne kadar güzel görünürse görünsün yavaş ürün hissi verir.

**Nasıl düzeltilir:** Renk ve basma için duration-150, panel için duration-200–300. Gerçek bir giriş hareketinde bulguyu gerekçeyle yok sayın.

### Gerekçesiz sonsuz döngü yok

`no-endless-loop` · not · denetlenir

**Kural:** Kalıcı bir öğe sonsuza dek canlanmaz. Yükleme göstergesi yüklerken dönebilir; canlı nokta pulse-for-live-only kuralına uyar; ürün sahnesi ekranda değerlendirilir.

**Neden:** Sonsuz hareket gözü okunan yerden çeker, göz de kısa sürede onu görmezden gelmeyi öğrenir.

**Nasıl düzeltilir:** Girişte bir kez oynatın ya da gerçek bir duruma bağlayın; ekran dışında ve "hareketi azalt" altında durdurun.

### Süs amaçlı yanıp sönen imleç yok

`no-blinking-cursor` · not · denetlenir

**Kural:** Yazılacak yer olmayan sayfada yanıp sönen imleç canlandırılmaz.

**Neden:** Etkinlik taklidi için terminal görünümünü ödünç alır.

**Nasıl düzeltilir:** Kaldırın. Gerçek alanlar kendi imlecini çizer.

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

### İnandırıcı örnek veri

`no-placeholder-data` · uyarı · denetlenir

**Kural:** Ekran, demo ve görüntülerde Lorem ipsum, John Doe, $123,456 ya da [X] yok; örnek veri ürünün dünyasından gerçek veri gibi görünür.

**Neden:** Dolgu veri bitmiş ekranı taslak gibi gösterir ve gerçek uzunlukların ortaya çıkaracağı yerleşim sorunlarını saklar.

**Nasıl düzeltilir:** Gerçekçi adlar, düzensiz basamaklı tutarlar ve gerçek uzunluklar kullanın.

### Gösterge kartı: etiket, değer, değişim

`stat-card-anatomy` · uyarı · gözden geçirilir

**Kural:** Gösterge kartı bu sırayla üç satırdır: kısa soluk etiket, büyük ve sabit genişlikli rakamlarla değer, sonra dönemiyle değişim ("geçen aya göre +%1,5"). Sayıyla yarışan ikon kutusu, mini grafik ya da emoji yok.

**Neden:** İncelediğimiz profesyonel panellerde en tutarlı örüntü buydu: göz tek sütunda aşağı okur ve değişim dönemi olmadan anlamsızdır.

**Nasıl düzeltilir:** Sırayı etiket → değer → değişim yapın; her değişimin yanına dönemi yazın.

### Grafik tek şeyi öne çıkarır

`chart-highlight-one` · uyarı · gözden geçirilir

**Kural:** Çubuk ve seriler nötrdür; vurgu rengi önemli olana gider (bu dönem, seçili nokta) ve değeri grafiğin üstünde yazılıdır. Kategori grafikleri gökkuşağı değil tek rengin basamaklarıdır.

**Neden:** İncelediğimiz profesyonel işler pasif çubukları açık gri tuttu ve birini yaktı; zayıf işler beş altı renk kullandı, bu da grafiği gösterge tablosunda arama işine çevirir.

**Nasıl düzeltilir:** Bir seri dışında hepsini griye çekin; onu doğrudan etiketleyin; küçük kategorileri "Diğer"de toplayın.

### Serileri grafiğin üstünde etiketleyin

`direct-labels` · not · gözden geçirilir

**Kural:** Üç ya da daha az seride ad ya da değer ayrı bir gösterge yerine çizginin sonuna ya da çubuğun üstüne yazılır.

**Neden:** Gösterge okuru renkleri ileri geri eşleştirmeye zorlar; doğrudan etiket bir kez okunur.

**Nasıl düzeltilir:** Gösterge metnini serisinin yanına taşıyın; göstergeyi yalnız çok seri varken tutun.

### Daha az önemli basamakları soldurun

`dim-secondary-digits` · not · gözden geçirilir

**Kural:** Öne çıkan sayıda kuruş, ondalık ya da birim ikincil metin rengindedir (422.525,82 $ içinde ,82 soluk); önemli kısım önce okunur.

**Neden:** İncelediğimiz en güçlü öne çıkan sayılar süs yerine bu tek ayrıntıyı kullandı.

**Nasıl düzeltilir:** Kesirli kısmı ikincil renkli bir span içine alın; boyut aynı kalsın.

### Demoya değil, en kötü veriye göre tasarım

`worst-case-data` · not · gözden geçirilir

**Kural:** Ekran tek öğeyle ("1 üye"), hiç öğeyle, çok büyük sayıyla ve bir müşterinin gerçekten sahip olduğu en uzun adla da düzgün durur.

**Neden:** Örnek verinin uzunlukları düzgündür. Gerçek hesapta tek üye, sıfır sipariş ve 40 harflik şirket adı olur.

**Nasıl düzeltilir:** Yerleşim için narrow --stress çalıştırın, sonra ekranı tek öğeyle ve hiç öğesiz açın: dil bilgisi ve boş durumlar yalnız gerçek veriyle görünür.

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

### Üzerine gelme stili yalnız fare olan yerde

`hover-media-query` · not · denetlenir

**Kural:** Elle yazılan CSS'te :hover, @media (hover: hover) içinde durur. Tailwind 4 bunu kendisi yapar.

**Neden:** Dokunuştan sonra hover görünümü başka yere dokunana kadar kalır; düğme takılmış gibi görünür.

**Nasıl düzeltilir:** Hover kurallarını @media (hover: hover) içine alın, dokunmaya :active durumu verin.

### Yüklenirken betik hatası yok

`no-script-errors` · hata · denetlenir

**Kural:** Sayfa yüklenirken hiçbir betik yakalanmamış hata vermez.

**Neden:** Bozuk JavaScript gösterimleri ve denetimleri sessizce durdurur, sayfayı boş bırakabilir.

**Nasıl düzeltilir:** Raporda adı geçen hatayı düzeltin.

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

### Arayüz metninde ünlem yok

`no-exclamation-copy` · uyarı · denetlenir

**Kural:** Etiket, sayı, bildirim ve başlıklar düz söyler: "!" ya da "!!" yok, "+12%!!" gibi değişimlerde de.

**Neden:** Ünlem her mesajı aynı derecede acil gösterir ve üretilmiş metnin güçlü bir izidir.

**Nasıl düzeltilir:** İşareti kaldırın; değişime karşılaştırmasını yazın ("geçen aya göre +%12").

### Başlık kullanıcıyı değil sayfayı adlandırır

`no-greeting-headline` · uyarı · denetlenir

**Kural:** Çalışılan ekranın başlığı "Tekrar hoş geldin, Ad" ya da "Günaydın" değildir; başlık sayfanın ne gösterdiğini söyler.

**Neden:** Selamlama ekranın en değerli satırını alır ve yüzüncü ziyarette hiçbir şey söylemez.

**Nasıl düzeltilir:** Başlık olarak sayfayı ya da dönemi yazın ("Genel bakış · bu hafta").

### Kaynağı olan sosyal kanıt

`no-unsourced-proof` · uyarı · denetlenir

**Kural:** "10.000+ ekip güveniyor", beş yıldız sırası ya da kaynaksız avatar yığını yok; müşterileri ya da puan sitesini adıyla yazın ya da çıkarın.

**Neden:** Yuvarlak ve kaynaksız sayılar ziyaretçinin ilk inanmadığı şeydir ve sayfanın geri kalanını da uydurma gösterir.

**Nasıl düzeltilir:** Gerçek sayıyı kaynağıyla ("App Store'da 4,8, 312 puan") ya da adı verilen bir müşteriyi gösterin.
