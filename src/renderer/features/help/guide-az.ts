// ── types ──────────────────────────────────────────────────────────────────
import type { GuideSection } from './types'

/**
 * The Azerbaijani guide.
 *
 * Written as Markdown and rendered through the application's own pipeline, so
 * the help page is drawn by the very renderer it documents — a callout or a
 * table that looks wrong here is a bug the reader can see immediately.
 */
export const GUIDE_AZ: GuideSection[] = [
  {
    id: 'start',
    title: 'Başlanğıc',
    markdown: `# Başlanğıc

MarkCraft **qovluq əsaslıdır**. Tək fayl da aça bilərsiniz, amma gücü qovluq açanda üzə çıxır: kənar paneldəki ağac, iş sahəsi üzrə axtarış, keçid qrafı və kitab rejimi — hamısı açıq qovluğa aiddir.

## İlk addımlar

1. **Qovluq açın** — \`Ctrl+Shift+O\`, yaxud xoş gəldiniz ekranındakı «Qovluq aç».
2. **Sənəd yaradın** — \`Ctrl+N\`. Saxlayana qədər «Untitled» adlanır.
3. **Saxlayın** — \`Ctrl+S\`.

## Üç görünüş, bir sənəd

Alt sağ küncdə üç düymə var:

| Görünüş | Nədir |
|---|---|
| **Zəngin redaktor** | Sintaksis görünmür, mətn yazdığınız kimi görünür |
| **Mənbə** | Xam Markdown, sətir nömrələri, sintaksis rəngləmə |
| **Bölünmüş** | Solda mənbə, sağda canlı önizləmə |

\`Ctrl+Shift+V\` onları növbə ilə dəyişir.

> [!NOTE]
> Bunlar **eyni sənədin üç görünüşüdür**, üç nüsxəsi deyil. Zəngin redaktorda yazdığınız dərhal Markdown-a, Markdown-da yazdığınız dərhal zəngin görünüşə keçir. Zəngin redaktordan keçmək Markdown-ınızın formatını dəyişmir.

## Kənar panel

Sol zolaqda iki qrup var, aralarında xətt:

- **Yuxarıda** — panelin *içini* dəyişənlər: fayllar, məzmun, axtarış, son sənədlər, səbət
- **Aşağıda** — bütün pəncərəni örtən alətlər: kitab, kanvas, öyrənmə, keçidlər, təqdimat, tərtibatçı alətləri

Aktiv düyməyə yenidən vursanız panel yığılır.

## Hər şeyi tapmağın yolu

\`Ctrl+Shift+P\` — **əmr palitrası**. Tətbiqdəki hər hərəkət bir axtarıla bilən siyahıdır. Qısayolu yadınızda saxlamağa ehtiyac yoxdur; adını yazmaq kifayətdir.`
  },

  {
    id: 'canvas',
    title: 'Kanvas',
    markdown: `# Kanvas

Kanvas **sonsuz səthdir**: üzərində kartlar dayanır, kartlar arasında xətlər olur. Sənəd xətti bir şeydir — birinci abzas, ikinci abzas. Kanvas xətti deyil: fikirləri yan-yana qoyub aralarındakı əlaqəni *görmək* üçündür.

## Nə vaxt işlədilir

- Yazmağa başlamazdan əvvəl fikirləri səpələmək
- Bir mövzunun hissələrini yan-yana qoyub struktur tapmaq
- Bir neçə sənədin bir-biri ilə necə bağlandığını lövhədə görmək
- Araşdırma qeydlərini mövzulara görə qruplaşdırmaq

Sənədlə əvəz etmək üçün deyil — **sənədə hazırlıq üçündür**.

## Necə açılır

Kənar paneldəki **kanvas ikonu**, yaxud \`Ctrl+Shift+P\` → «Kanvas».

Kanvas açıq qovluğun içindəki **\`canvas.canvas\`** faylında saxlanılır. Fayl yoxdursa, boş kanvas açılır və ilk saxlamada yaranır.

> [!IMPORTANT]
> Kanvas üçün **əvvəlcə qovluq açmalısınız**. Qovluq yoxdursa, saxlayacaq yer də yoxdur.

## İdarəetmə

| Hərəkət | Necə |
|---|---|
| **Sürüşdürmək** | Boş yerdən tutub çəkin |
| **Miqyas** | Siçan təkəri — kursorun altındakı nöqtə yerində qalır |
| **Kartı köçürmək** | Kartdan tutub çəkin, 20 pikselik şəbəkəyə oturur |
| **Kart seçmək** | Kartın üzərinə klik — mavi çərçivə görünür |
| **Kartın içində yazmaq** | İki dəfə klikləyin, ya seçib \`Enter\` basın. Kənara klikləmək saxlayır, \`Escape\` imtina edir |
| **Kartın ölçüsünü dəyişmək** | Sağ alt küncdəki kiçik kvadratı çəkin |
| **İki kartı birləşdirmək** | Seçilmiş kartın dörd dəyirmi tutacağının birindən digər kartın üzərinə çəkin |
| **Kart silmək** | Seçin, sonra \`Delete\` və ya \`Backspace\` — ona gedən xətlər də silinir |
| **Kart əlavə etmək** | Yuxarıdakı «Kart əlavə et» düyməsi — kart birbaşa yazmağa hazır açılır |
| **Qrup əlavə etmək** | Qrup ikonu — seçilmiş kartı əhatə edir, seçim yoxdursa boş çərçivə qoyur |
| **Geri almaq** | \`Ctrl+Z\`, yaxud geri al ikonu. Bütöv bir çəkmə bir addımdır, hər piksel üçün ayrı deyil |
| **Ekrana sığdırmaq** | Genişləndirmə ikonu — hamısını görünəcək şəkildə miqyaslayır |
| **Saxlamaq** | \`Ctrl+S\`, yaxud disket ikonu |

Başlıqda **kart sayı və miqyas faizi** göstərilir. Saxlanmamış dəyişiklik varsa fayl adının yanında **nöqtə** çıxır.

## Kartların içində Markdown var

Kart sadə mətn qutusu deyil — **Markdown göstərir**. Yəni kartın içində başlıq, qalın mətn, siyahı, hətta cədvəl ola bilər:

\`\`\`md
## Əsas fikir

- birinci dəlil
- ikinci dəlil
\`\`\`

Bu, kanvası sənədlə eyni dildə saxlayır: kartdakı mətni sənədə köçürsəniz, orada da eyni görünür.

## Fayl formatı — JSON Canvas

Kanvas **JSON Canvas** formatında saxlanılır. Bu, Obsidian-ın yazdığı **açıq formatdır**.

Bunun sizin üçün mənası:

- Burada qurduğunuz kanvas **Obsidian-da açılır**
- Obsidian-da qurduğunuz kanvas **burada açılır**
- Fayl adi JSON-dur — istəsəniz mətn redaktorunda açıb baxa bilərsiniz
- İşiniz bu tətbiqin içində **həbs olunmur**

Özəl format yazmaq bizim üçün asan olardı və sizin işinizi buraya bağlayardı.

## Hazırkı məhdudiyyətlər

Açıq deyim, çünki fayl formatı bunları dəstəkləyir, amma **interfeys hələ dəstəkləmir**:

- Kartın **mətnini kanvasın içində redaktə etmək** olmur — hazırda mətn yalnız göstərilir. Dəyişmək üçün \`canvas.canvas\` faylını mətn redaktorunda açmaq lazımdır.
- **Kartlar arasında yeni xətt çəkmək** olmur — mövcud xətlər göstərilir, yenisi çəkilmir.
- **Qrup yaratmaq** olmur, amma başqa proqramda yaradılmış qruplar göstərilir.

Xətlərin hansı tərəfdən çıxacağı avtomatik seçilir: xətt həmişə qarşı kartın üzünə baxan tərəfdən çıxır, öz kartının üstündən keçmir.`
  },

  {
    id: 'writing',
    title: 'Yazmaq',
    markdown: `# Yazmaq

## \`/\` blok menyusu

Sətir başında və ya boşluqdan sonra **\`/\`** yazın — on dörd blokdan ibarət menyu açılır:

başlıqlar · nöqtəli siyahı · nömrəli siyahı · tapşırıq siyahısı · sitat · kod bloku · qeyd bloku · cədvəl · keçid · şəkil · emoji · ayırıcı

Yazmağa davam edin, siyahı daralır. **Enter** və ya **Tab** seçir, **Escape** bağlayır və yazdığınızı saxlayır.

Həm ingilis adı, həm də öz diliniz uyğun gəlir — \`/başlıq\` da, \`/heading\` də işləyir.

> [!TIP]
> Menyu fayl yollarının (\`src/renderer\`) və URL-lərin içində açılmır. Kəsik yalnız sətir başında və ya boşluqdan sonra blok menyusu sayılır.

## Alət paneli

Redaktorun üstündəki zolaq. **Hansı düymələrin və hansı sıra ilə görünəcəyini** Parametrlər → Görünüş bölməsindən seçirsiniz.

## Şablonlar

\`Ctrl+Alt+N\` — hazır formadan sənəd başlayır: iclas qeydləri, məqalə, tapşırıq siyahısı. Şablonlar **tərcümə olunub**, ingilis mətni deyil.

## Emoji

\`Ctrl+Alt+M\`, alət paneli, yaxud \`/emoji\`. Ada görə axtarın; ən çox işlətdikləriniz yuxarıda qalır.

## Söz hədəfi

Statistika panelində sənəd üçün hədəf təyin edin — status panelində irəliləyiş görünür. Hədəf **sənədə aiddir**, tətbiqə yox: hər faylınız üçün eyni rəqəm hədəf deyil, xatırlatmadır.

## Yazı seriyası

Statistika paneli yazdığınız günləri sayır və son dörd həftəni kvadratlarla göstərir.

Bir qərarı bilməyiniz yaxşıdır: **dünən bitən seriya bu gün hələ sayılır**. Səhər hələ yazmamısınızsa, heç nə pozmamısınız. Seriya yalnız tam bir gün yazılmadan keçəndən sonra qırılır.

Qeyddə yalnız **tarix və rəqəm** var — heç vaxt fayl adı.`
  },

  {
    id: 'markdown',
    title: 'Markdown imkanları',
    markdown: `# Markdown imkanları

## Qeyd blokları

Sitatın əvvəlinə etiket qoyun:

\`\`\`md
> [!NOTE]
> Adi qeyd.

> [!WARNING]
> Diqqət tələb edən şey.
\`\`\`

Beş növ var: \`NOTE\` · \`TIP\` · \`IMPORTANT\` · \`WARNING\` · \`CAUTION\`. Hamısı **ixracda da** rənglənir.

## Riyaziyyat və diaqramlar

\`$E = mc^2$\` KaTeX ilə göstərilir.

\`mermaid\` bloku diaqrama çevrilir və tətbiqin öz rənglərini götürür — mövzunuzu dəyişsəniz diaqram da dəyişir. Mermaid **yalnız sənəddə diaqram olanda** yüklənir, ona görə diaqramsız sənəd üçün heç nə ödəmirsiniz.

## Wiki keçidləri

\`[[Başqa qeyd]]\` → \`Başqa qeyd.md\` faylına keçid. İstənilən qovluqdan fayl adı ilə tapılır.

İki qovluqda eyni adlı fayl varsa, **təxmin edilmir** — qırıq keçid kimi bildirilir. Ağlabatan amma səhv yerə göndərmək, qırıq deyilməkdən daha çətin fərq edilir.

## Başlıq lövbərləri

Hər başlığa avtomatik id verilir (GitHub qaydaları ilə), ona görə \`[](#bir-bölmə)\` işləyir. Qeyri-latın başlıqlar da düzgün işlənir — \`## Quraşdırma\` → \`#quraşdırma\`.

## Kod blokları

Blokun üstündə **dil etiketi** və **kopyalama düyməsi** var. Kopyalama xam mətni götürür, vurğulayıcının çəkdiyini yox.

**Dili dəyişmək:** kursor blokun içində olarkən \`Ctrl+Shift+P\` → «Kod blokunun dilini seç». Hələ bağlamadığınız blokda da işləyir.

## Kodu işə salmaq

Maşınınızda quraşdırılmış dildə blokun üstündə **Run düyməsi** çıxır: JavaScript, Python, Ruby, PHP, Go, shell, PowerShell.

Nəticə blokun **öz altında** görünür.

> [!CAUTION]
> **Sandbox yoxdur və biz olduğunu iddia etmirik.** Kod sizin öz icazələrinizlə işləyir — bloku fayla yazıb özünüz işə salsaydınız necə olacaqdısa, elə. Fayllarınızı oxuya və şəbəkəyə çıxa bilər.
>
> Ona görə **heç vaxt öz-özünə işə düşmür**: nə sənəd açılanda, nə saxlananda, nə önizləmədə. Yalnız siz düyməni basanda, blok-blok.
>
> 10 saniyə vaxt limiti var; sonsuz döngə öldürülür.

## Linter və təmizləmə

Statistika paneli **doqquz qaydanı** yoxlayır — hashdan sonra boşluğu olmayan başlıq, bağlanmamış kod bloku, alt mətni olmayan şəkil, qırıq lövbərlər, təkrarlanan başlıqlar.

Düzəldiləsi şey varsa **«Təmizlə» düyməsi** çıxır. O, yalnız **cavabı birmənalı olan dördünü** düzəldir: yapışmış başlıq, tablar, artıq boşluqlar, bağlanmamış blok.

Qalan beşinə toxunmur — alt mətn uydurmaq və ya blok üçün dil seçmək **formanı yox, mənanı** dəyişmək olardı.`
  },

  {
    id: 'files',
    title: 'Fayllar və sənədlər',
    markdown: `# Fayllar və sənədlər

## Fayl ağacı

Qovluqlar **açanda oxunur**, əvvəlcədən yox. 50 000 fayllıq repozitoriya açmaq yalnız genişlətdiyiniz qovluqlar qədər vaxt aparır.

Sağ klik: yaratmaq, adını dəyişmək, ikiqat surət, silmək, köçürmək, kopyalamaq. Sürüşdürüb-atmaq da işləyir, \`Ctrl+C\` və \`Ctrl+V\` fayllar üzərində də işləyir.

Standart olaraq **yalnız redaktorun aça bildiyi fayllar** göstərilir. Parametrlər → Fayllar bölməsindən hamısını göstərə bilərsiniz.

## Tablar

Sıralarını dəyişmək olur. Saxlanmamış tabda nöqtə görünür. Bağlananı geri açmaq: \`Ctrl+Shift+T\`.

## İş sahəsi üzrə axtarış

\`Ctrl+Shift+F\` — qovluq boyu tap və əvəz et. Glob, regex, tam söz və hərf həssaslığı seçimləri var.

## Versiya tarixçəsi

**Hər saxlama saxlanılır.** Fərqi görüb bir kliklə geri qaytara bilərsiniz. Bu, çökmə bərpasından ayrıdır: bərpa «cərəyan gedəndə nə yazırdım» sualına cavab verir, tarixçə «çərşənbə axşamı bu necə görünürdü» sualına.

## Səbət

Silinən fayllar bərpa oluna bilər. Limit tənzimlənir, istəsəniz limitsiz.

## Münaqişə müdafiəsi

Fayl diskdə dəyişibsə, saxlama **səssizcə üstündən yazmır** — sizə seçim verilir: surət kimi saxla, yenidən yüklə, yaxud üstündən yaz.

## Sənədi kilidləmək

\`Ctrl+Shift+P\` → «Bu sənədi kilidlə və ya aç».

Kilidli sənəddə redaktə bağlanır və status panelində **«Kilidli»** görünür. Saxlama da bloklanır — avtosaxlama və «hamısını saxla» da buna hörmət edir.

> [!NOTE]
> Bu **təhlükəsizlik sərhədi deyil**. Bitmiş, təsdiqlənmiş və ya başqasının sənədində təsadüfi düymə basmasına qarşı qoruyucudur. Faylın diskdəki icazələri dəyişmir — o, əməliyyat sisteminin işidir.

## Şəkillər

Lokal şəkil əlavə edəndə **kəsmə və sıxma** təklif olunur:

- Şəklin üzərində sürüşdürüb kəsmə sahəsi seçin
- Sıxmanı açın, keyfiyyəti tənzimləyin
- Maksimum en seçin (800 / 1200 / 1600 / 2400 və ya orijinal)

Alınacaq ölçü siz qərar verərkən göstərilir. Sıxma **WebP** işlədir — şəffaflıq itmir, ona görə yuvarlaq künclü ekran şəkli salamat qalır.

## Hər şeyi atmaq

Redaktora fayl atın: şəkillər daxil edilir, Markdown və mətn faylları açılır, qalan hər şeyə nisbi keçid qoyulur.`
  },

  {
    id: 'views',
    title: 'Təqdimat, vebsayt, keçidlər',
    markdown: `# Sənədi başqa cür görmək

## Təqdimat rejimi

**\`F5\`** sənədi slaydlara çevirir. Yalnız \`---\` olan sətir slayd ayırıcısıdır.

Bunun mənası: **oxumaq üçün yazılmış sənəd onsuz da düzgün təqdim olunur** — müəllifin bölmələr arasına qoyduğu ayırıcılar elə slaydların dəyişməli olduğu yerlərdir.

| Düymə | Nə edir |
|---|---|
| \`→\` \`Page Down\` \`Space\` | Növbəti |
| \`←\` \`Page Up\` | Əvvəlki |
| \`Home\` / \`End\` | Birinci / sonuncu |
| \`Escape\` | Çıxış |

Slaydlar **önizləmə ilə eyni boru xəttindən** keçir, ona görə cədvəl və ya diaqram hər ikisində eyni görünür.

## Vebsayt görünüşü

**\`Ctrl+Alt+W\`** sənədi üç cihaz enində göstərir: **390** (telefon), **768** (planşet), **1280** (noutbuk).

Bunlar yuvarlaq rəqəmlər deyil — 390 iPhone 14-dür. Uydurma 400 hamının işlətdiyi telefonu sakitcə yayındırardı.

Çərçivə həmin endə **əsl elementdir**, kiçildilmiş şəkil deyil: mətn və cədvəllər oxucuda necə sarınacaqsa elə sarınır. Miqyas yalnız sonra tətbiq olunur ki, 1280-lik maket ekrana sığsın.

## Keçidlər və qraf

**\`Ctrl+Alt+L\`** qovluğu nəzərdən keçirir və çəkir:

- **Xəritə** — sənədlər düyün, keçidlər xətt kimi. Çox bağlı sənəd daha böyük dairə olur. Düyünün üstünə gələndə yalnız onunla bağlı olanlar işıqlanır. Kliklə həmin sənəd açılır.
- **Geriyə keçidlər** — oxuduğunuz sənədə kim keçid verir
- **Qırıq keçidlər** — hər biri faylı və sətri ilə

Xəritə **həmişə eyni şəkli çəkir**: təsadüfi yerləşdirmə yoxdur. Hər açılışda yenidən düzülən xəritə xəritə deyil.`
  },

  {
    id: 'book-study',
    title: 'Kitab və öyrənmə',
    markdown: `# Kitab və öyrənmə

## Kitab rejimi

Qovluğa **\`SUMMARY.md\`** əlavə edin — fəsilləri iç-içə keçid siyahısı kimi sadalayın:

\`\`\`md
# Məzmun

- [Giriş](giris.md)
- Birinci hissə
  - [Birinci fəsil](bir/birinci.md)
  - [İkinci fəsil](bir/ikinci.md)
- [Əlavə](elave.md)
\`\`\`

Bundan sonra kənar paneldəki **kitab ikonu** mündəricatı mətninizin yanında göstərir, \`Ctrl+Alt+K\` isə eyni kitabı dialoq şəklində açır.

- Keçidi olmayan bənd (**Birinci hissə**) hissə başlığıdır — getməli yer deyil
- Fəslə klik onu ayrıca açır
- Oxuduğunuz fəsil vurğulanır, başlıqda isə **harada olduğunuz** görünür — 3/12
- Panelin altındakı oxlar **əvvəlki və növbəti fəslə** keçir: kitabın sırası ilə, qovluğun əlifba sırası ilə deyil
- Diskdə olmayan fəsil sarı üçbucaqla bildirilir, oxlar isə onun üstündən adlayır

**«Bir sənəd kimi aç»** hamısını birləşdirir və hər fəslin başlıqlarını **öz dərinliyinə sürüşdürür**: öz faylında \`# Birinci fəsil\` olan mətn kitabda \`## Birinci fəsil\` olur. Yoxsa birləşmiş sənəddə onlarla birinci səviyyə başlıq və heç bir struktur alınardı.

Bu, doqquzuncu ixrac formatı deyil — **birləşmiş mətn adi sənəddir**, ona görə mövcud səkkiz formatın hamısı onun üzərində onsuz da işləyir.

> [!TIP]
> \`SUMMARY.md\` formatı mdBook və GitBook-un işlətdiyi formatdır. Məzmun cədvəli adi sənəddir — bu redaktorda yazılır, sətirləri sürüşdürməklə yenidən sıralanır, GitHub-da oxunur.

## Öyrənmə rejimi

Kartlar **sənədin özündə** yaşayır. İki forma:

\`\`\`md
Ontologiya :: varlıq haqqında elm

Monad nədir?
?
Endofunktorlar kateqoriyasında monoid.
\`\`\`

Birincisi bir sətirdir — lüğət və qısa faktlar üçün. İkincisi blokdur — yer tələb edən hər şey üçün.

Kənar paneldəki **öyrənmə ikonu** seansı açır:

1. Sual göstərilir, cavab gizlidir
2. **Space** və ya «Cavabı göstər»
3. Dörd qiymət: **Yenidən¹ · Çətin² · Yaxşı³ · Asan⁴** (rəqəm düymələri də işləyir)

**«Yenidən» kartı seansın sonuna atır** — nə heç vaxt, nə də dərhal. Kartı unudub bir gün sonra yenidən görmək, dəstənin çürüməsinin yoludur.

Cədvəl **tətbiqin datasında** saxlanılır, sənəddə yox: təkrar cədvəli şəxsidir, və «növbəti cümə axşamı» sözünü qeydinizə yazmaq versiya nəzarətinə mənasız dəyişiklik salardı.

Kart **öz mətni ilə tanınır**. Sənədi yenidən sıralaya, kartın ətrafını yenidən yaza bilərsiniz — kart tarixçəsini itirmir.

> [!IMPORTANT]
> Öyrənmə rejimi üçün sənəd **saxlanılmış olmalıdır** — cədvəl fayl yoluna bağlanır.`
  },

  {
    id: 'export',
    title: 'İxrac və paylaşma',
    markdown: `# İxrac və paylaşma

\`Ctrl+Alt+E\` — **səkkiz format**:

| Format | Nə üçün |
|---|---|
| **Markdown** | Sənəd olduğu kimi |
| **Düz mətn** | Sintaksis çıxarılmış proza |
| **Zəngin mətn (.rtf)** | Formatlı mətn oxuyan hər şey |
| **Word (.docx)** | Word, Pages, Google Docs |
| **HTML** | Stilləri və şəkilləri daxilində olan tək səhifə |
| **PDF** | Səhifələnmiş |
| **PNG** | Şəkil |
| **JSON** | Strukturlu məlumat |

Çap sənədi göstərir, **redaktoru yox**.

## Word və RTF barədə

Hər ikisi sənədinizin **eyni oxunuşundan** yaranır, ona görə bir-birindən fərqlənə bilməz. Başlıqlar, siyahılar, tapşırıq qutuları, sitatlar və kod hamısı keçir.

RTF-də Azərbaycan hərfləri düzgün gedir — RTF Unicode-dan əvvəlki formatdır və hər ASCII-dən yuxarı simvol əl ilə kodlanmalıdır, yoxsa mojibake alınır.

## Markdown kimi yapışdırmaq

Veb səhifədən kopyalayıb \`Ctrl+Shift+P\` → **«Markdown kimi yapışdır»**.

Başlıqlar, siyahılar, cədvəllər və kod salamat qalır; səhifənin **naviqasiyası, banneri və altlığı qalmır**.

Bu, \`Ctrl+V\`-ni ələ keçirmir. Zəngin mətn kopyalayıb **bəzən** Markdown almaq — mənbə tətbiqin buferə nə qoymasından asılı olaraq — ən pis növ gözlənilməzlikdir.

## Paylaşma

Sənədi e-poçtla göndərmək: qoşma ilə hazır məktub açılır. Alan tərəfin heç nə quraşdırmasına ehtiyac yoxdur.`
  },

  {
    id: 'tools',
    title: 'Alətlər və AI',
    markdown: `# Alətlər

## Tərtibatçı alətləri

**\`Ctrl+Alt+T\`** — texniki sənəd yazanın ikinci brauzer tabı açmalı olduğu şeylər:

JSON səliqələmə/sıxlaşdırma · JSON↔YAML · Base64 · URL kodlama · JWT açma · vaxt möhürü çevirmə · regex sınağı · UUID

**Hamısı lokal işləyir** və məsələ elə bundadır: bura yapışdırdığınız mətn adətən token, konfiqurasiya faylı və ya müştəri məlumatı olur, onları veb səhifəyə yapışdırmaq isə tərk edilməli vərdişdir.

JWT-də imza **göstərilir, amma yoxlanılmır** — yoxlamaq üçün gizli açar lazımdır, və açarsız «etibarlıdır» yazmaq bu sözün yeganə mənası haqqında yalan olardı.

## HTTP sorğusu

Sənədin bəhs etdiyi API üçün: metod, ünvan, başlıqlar, gövdə; cavabda status, müddət və səliqələnmiş nəticə.

Başlıqlar sətirdə bir dənə yazılır: \`Ad: dəyər\`. **\`#\` ilə başlayan sətir nəzərə alınmır** — auth başlığını müvəqqəti söndürmək üçün.

Qorumalar:

- **Yalnız \`http://\` və \`https://\`** — hər yönləndirmədə yenidən yoxlanır
- **Kuki və kimlik məlumatı getmir** — yalnız sizin yazdığınız başlıq
- 30 saniyə limiti, 5 MB tavan
- **Yalnız düyməni basanda** işə düşür

## AI köməkçisi

**Standart olaraq bağlıdır.** Parametrlər → AI bölməsindən provayder əlavə edirsiniz: OpenRouter, OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Together, xAI, Fireworks — yaxud lokal Ollama / LM Studio.

Beş hərəkət:

| Hərəkət | Nə edir |
|---|---|
| **Səliqəyə sal** | Qrammatika, durğu işarələri, ifadə |
| **Detallandır** | Mövcud fikirləri açır, fakt uydurmur |
| **Xülasə et** | Əsas məqamlara qədər qısaldır |
| **Nəzərdən keçir** | **Yenidən yazmır** — tapıntı bildirir |
| **Öz göstərişin** | Nə istəsəniz |

«Nəzərdən keçir» digərlərindən prinsipial fərqlidir: sənəd qaytarmır, siyahı qaytarır — struktur uyğunsuzluqları, çatışmayan bölmələr, izahsız iddialar. Ona görə onun nəticəsində **«Əvəz et» düyməsi yoxdur**.

> [!NOTE]
> Açarlar əməliyyat sistemi hesabınızla şifrələnir və **\`settings.json\`-a heç vaxt düşmür**. Göndərməzdən əvvəl tətbiq sizə **nə göndərəcəyini göstərir**.`
  },

  {
    id: 'customise',
    title: 'Fərdiləşdirmə',
    markdown: `# Fərdiləşdirmə

## Mövzu və rənglər

Parametrlər → Görünüş:

- **İşıqlı / Qaranlıq / Sistem**
- **Yeddi vurğu rəngi**
- **Altı palitra** — Nord, Solarized, Gruvbox, Rosé Pine, Sepia, yüksək kontrast
- **Fərdi rənglər** — hər rəng nişanını ayrıca dəyişmək, daxili seçici ilə

Rəng seçicisi tətbiqin öz komponentidir, əməliyyat sisteminin dialoqu deyil.

## İkonlar

Fayla, qovluğa, yaxud bütöv fayl növünə öz ikonunu və rəngini verin — daxili dəstdən, yaxud öz SVG-nizdən.

## Dil

İngilis, Azərbaycan, rus. **Dördüncüsü isə tətbiqin data qovluğuna atdığınız JSON faylıdır** — yenidən yığmağa ehtiyac yoxdur.

## Qısayollar

Parametrlər → Klaviatura. **Hər əmrin qısayolu dəyişdirilə bilər.** Münaqişə varsa göstərilir.

## İnterfeys miqyası

\`Ctrl +\` və \`Ctrl -\` kənar paneli və parametrləri **redaktor mətnindən asılı olmayaraq** böyüdür. Redaktorun şrift ölçüsü ayrıca tənzimlənir.

## Axtarıla bilən parametrlər

Parametrlərdə yazın — bütün səhifələr üzrə tapır, seçdiyinizdə həmin səhifə açılır və idarəçi işıqlanır.`
  },

  {
    id: 'shortcuts',
    title: 'Qısayollar',
    markdown: `# Qısayollar

Tam siyahı **Parametrlər → Klaviatura**-dadır və hamısı dəyişdirilə bilər. Hər şey əmr palitrasından da əlçatandır.

## Əsas

| Əməliyyat | Qısayol |
|---|---|
| Əmr palitrası | \`Ctrl+Shift+P\` |
| Yeni / Aç / Saxla | \`Ctrl+N\` / \`O\` / \`S\` |
| Fərqli saxla | \`Ctrl+Shift+S\` |
| Qovluq aç | \`Ctrl+Shift+O\` |
| Tabı bağla / geri aç | \`Ctrl+W\` / \`Ctrl+Shift+T\` |
| Parametrlər | \`Ctrl+,\` |

## Redaktə

| Əməliyyat | Qısayol |
|---|---|
| Tap / Əvəz et | \`Ctrl+F\` / \`Ctrl+H\` |
| İş sahəsində axtar | \`Ctrl+Shift+F\` |
| Sətrə keç | \`Ctrl+G\` |
| Qalın / Maili / Kod | \`Ctrl+B\` / \`I\` / \`E\` |
| Keçid əlavə et | \`Ctrl+K\` |
| Başlıq 1–6 / Abzas | \`Ctrl+1…6\` / \`Ctrl+0\` |
| Emoji | \`Ctrl+Alt+M\` |
| Şablondan yeni | \`Ctrl+Alt+N\` |

## Görünüş

| Əməliyyat | Qısayol |
|---|---|
| Görünüşü dəyiş | \`Ctrl+Shift+V\` |
| Oxu rejimi | \`Ctrl+Shift+R\` |
| Məzmun | \`Ctrl+Shift+U\` |
| Təqdimat | \`F5\` |
| Vebsayt görünüşü | \`Ctrl+Alt+W\` |
| Keçidlər və qraf | \`Ctrl+Alt+L\` |
| Kitab | \`Ctrl+Alt+K\` |
| Tərtibatçı alətləri | \`Ctrl+Alt+T\` |
| Kənar paneli göstər/gizlət | \`Ctrl+Alt+B\` |
| Mövzunu dəyiş | \`Ctrl+Shift+D\` |
| Çap / İxrac | \`Ctrl+P\` / \`Ctrl+Alt+E\` |
| İnterfeys böyüt / kiçilt / sıfırla | \`Ctrl+=\` / \`Ctrl+-\` / \`Ctrl+Alt+0\` |`
  }
]
