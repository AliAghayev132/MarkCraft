# MarkCraft

[English](README.md) · **Azərbaycanca** · [Русский](README.ru.md)

Electron, React və TypeScript ilə qurulmuş peşəkar masaüstü Markdown redaktoru.

MarkCraft iki nəfərə eyni dərəcədə yaxşı xidmət etmək üçün nəzərdə tutulub:
sintaksis haqqında düşünmək istəməyən və sakit yazı səthi axtaran **yazıçıya**,
və əsl mənbə redaktoru, fayl ağacı, iş sahəsi axtarışı və hər şeyin klaviatura
ilə idarəsini istəyən **tərtibatçıya**.

---

## Əsas imkanlar

| Sahə | Nə edir |
|---|---|
| **Üç redaktə səthi** | WYSIWYG zəngin redaktor, tam Markdown mənbə redaktoru və canlı önizləmə — *bir* sənədin üç görünüşü kimi, üç nüsxəsi kimi yox. |
| **Bölünmüş görünüş** | Mənbə və önizləmə yan-yana; sürüşdürmə sinxronizasiyası faiz hesabı ilə yox, real sətir uyğunlaşması ilə işləyir. |
| **Fərdi fayl explorer-i** | Tənbəl, virtuallaşdırılmış ağac: tam CRUD, çoxlu seçim, sürüklə-burax, filtr və çeşidləmə. 50 000 fayllıq repozitoriyanı açmaq yalnız açdığınız qovluqlara başa gəlir. |
| **Tablar** | Sırasını dəyişmək olar; dəyişiklik göstəricisi, digərlərini/hamısını bağla və bağlananı yenidən aç. |
| **İş sahəsində axtarış** | Qovluq boyu tap və əvəz et — glob, regex, tam söz və registr seçimləri ilə. |
| **Əmr paleti** | `Ctrl/Cmd + Shift + P`. Proqramdakı hər əməliyyat bir axtarıla bilən siyahıda. |
| **Dəyişdirilə bilən qısayollar** | Hər əmrin qısayolu Parametrlər → Klaviatura bölməsində dəyişdirilə bilər. |
| **Çökmədən bərpa** | Saxlanılmamış iş davamlı jurnala yazılır və növbəti açılışda geri təklif olunur — adsız sənədlər də daxil. |
| **Konflikt qoruması** | Xarici dəyişikliklər aşkarlanır; saxlama heç vaxt altınızdan dəyişmiş faylın üstündən səssizcə yazmır. |
| **İxrac və çap** | Markdown, özü-özünə yetərli HTML və səhifələnmiş PDF; çap sənədi göstərir, redaktoru yox. |
| **Mövzular** | İşıqlı, qaranlıq və sistem; yeddi vurğu rəngi, altı adlandırılmış palitra (Nord, Solarized, Gruvbox, Rosé Pine, Sepia, yüksək kontrast) və daxili seçici ilə ayrı-ayrı rəng dəyişiklikləri. |
| **Üç dil** | İngilis, Azərbaycan və rus dilləri — dördüncüsü isə proqramın data qovluğuna atdığınız bir JSON faylıdır, yenidən qurmağa ehtiyac yoxdur. |
| **Markdown explorer-i** | Fayl ağacı yalnız redaktorun aça bildiyi faylları göstərir. Parametrlər → Fayllar bölməsindəki bir açar qalanını geri qaytarır. |
| **Fərdi ikon və rənglər** | Fayla, qovluğa və ya bütöv fayl növünə öz ikonunu və rəngini verin — daxili dəstdən və ya öz SVG-lərinizdən. |
| **İnterfeys miqyası** | `Ctrl/Cmd +` və `Ctrl/Cmd -` yan paneli və parametrləri redaktor mətnindən asılı olmadan böyüdüb-kiçildir. |
| **Sənəd kimi açılır** | `.md` faylına iki dəfə klikləyin — təmiz oxuma görünüşündə açılır: göstərilən sənəd və bir Redaktə düyməsi, bölünmüş panelli redaktor yox. |
| **Struktur (Outline)** | Yan paneldə canlı mündəricat — `Ctrl/Cmd + Shift + U`. Markdown-dan oxunur, ona görə hər görünüş rejimində işləyir. |
| **Söz hədəfləri** | Hər sənəd üçün hədəf qoyun; status paneli onu izləyir. |
| **Sənədi e-poçtla göndər** | Poçt proqramınızda `.md` qoşulmuş qaralama açır — qarşı tərəfə heç nə quraşdırmaq lazım deyil. |
| **Riyaziyyat və diaqramlar** | `$…$` KaTeX ilə göstərilir; ```mermaid bloku diaqrama çevrilir və proqramın öz tokenləri ilə rənglənir, yəni mövzunuza uyğun gəlir. Mermaid yalnız sənəddə həqiqətən diaqram olanda yüklənir. |
| **Wiki keçidləri** | `[[Başqa qeyd]]` → `Başqa qeyd.md`, adi nisbi keçid kimi həll olunur. |
| **Şablonlar** | `Ctrl/Cmd + Alt + N` sənədi hazır formadan başladır — iclas qeydləri, məqalə, görüləcəklər — tərcümə edilmiş, ingilis şablonu deyil. |
| **Cədvəl redaktəsi** | Zəngin görünüşdə kursor cədvəlin içindəykən idarəetmələr görünür; Markdown boruları düymənin sintaksisi üstələdiyi yeganə yerdir. |
| **Öz AI-nızı gətirin** | İstəyə bağlı, standart olaraq söndürülü. OpenRouter, OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Together, xAI, Fireworks — və ya yerli Ollama / LM Studio qoşun, seçilmiş mətn üzərində «Səliqəyə sal», «Detallandır», «Xülasə et» və sərbəst göstərişlər alın. Açarlar OS hesabınız üçün şifrələnir və heç vaxt `settings.json`-a düşmür. |
| **Axtarıla bilən parametrlər** | Parametrlərdə yazın — bütün səhifələr üzrə istənilən seçim tapılır; nəticəni seçəndə səhifə açılır və idarəetmə işıqlandırılır. |
| **Təqdimat rejimi** | `F5` sənədi slaydlara çevirir, `---` ilə bölünür. Slaydlar önizləmənin öz boru xəttindən keçir, ona görə cədvəl hər ikisində eyni görünür. |
| **`/` blok menyusu** | Sətir başındakı kəsik on dörd blok açır — başlıqlar, siyahılar, qeyd blokları, cədvəllər, emoji. Fayl yolları və URL-lərin içində açılmır, həm ingilis adı, həm də öz diliniz uyğun gəlir. |
| **Tərtibatçı alətləri** | `Ctrl/Cmd + Alt + T`. JSON, JSON↔YAML, Base64, URL, JWT, vaxt möhürləri, regex sınağı və UUID — hamısı oflayn, çünki bura yapışdırılan adətən token və ya müştəri məlumatı olur. |
| **Keçidlər və qraf** | `Ctrl/Cmd + Alt + L` sənədlərin bir-birinə necə istinad etdiyini göstərir, oxuduğunuza kimin keçid verdiyini sadalayır və hər qırıq keçidi faylı ilə bildirir. |
| **Vebsayt görünüşü** | `Ctrl/Cmd + Alt + W` sənədi 390, 768 və 1280 piksel enində göstərir — həmin endə əsl çərçivə, ona görə mətn oxucuda necə sarınacaqsa elə sarınır. |
| **Şəkil kəsmə və sıxma** | Lokal şəkillər sənədə çatmazdan əvvəl kəsilir və sıxılır, alınacaq ölçü siz qərar verərkən göstərilir. WebP, ona görə şəffaflıq itmir. |
| **Qeyd blokları** | `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` — həm redaktorda, həm ixracda. |
| **Emoji seçici** | `Ctrl/Cmd + Alt + M`, alət paneli və ya `/emoji`. Axtarıla bilir, ən çox işlətdikləriniz öndə. |
| **Markdown linteri** | Həqiqətən səhv göstərilənləri tutan doqquz qayda — hashdan sonra boşluğu olmayan başlıq, bağlanmamış blok, alt mətni olmayan şəkil — qırıq lövbərlər və təkrar başlıqlarla birlikdə. |
| **Fərdiləşən alət paneli** | Hansı alətlərin və hansı sıra ilə görünəcəyini seçin. |
| **Səkkiz ixrac formatı** | Markdown, düz mətn, zəngin mətn (.rtf), Word (.docx), müstəqil HTML, səhifələnmiş PDF, PNG və strukturlu JSON. |
| **Kitab rejimi** | Fəsilləri iç-içə siyahı kimi sadalayan `SUMMARY.md` qovluğu bir əsərə çevirir — `Ctrl/Cmd + Alt + K`. Fəsillər ayrıca açılır və ya başlıqları öz dərinliyinə sürüşdürülərək bir sənəddə birləşir. mdBook və GitBook-un işlətdiyi format. |
| **Öyrənmə rejimi** | `Termin :: məna` yazın, yaxud sual, yalnız `?` olan sətir və cavab — qeyd təkrarlana bilən olur. Bir anda bir kart, və ətrafındakı mətn yenidən yazılsa da yaşayan cədvəl. |
| **Kanvas** | Markdown kartları və aralarındakı xətlərdən ibarət sonsuz səth, JSON Canvas kimi saxlanılır — Obsidian-ın yazdığı açıq format, orada da açılır. |
| **HTTP sorğusu** | Sənədin bəhs etdiyi API üçün. Yalnız `http://` və `https://`, hər yönləndirmədə yenidən yoxlanır, kuki və kimlik məlumatı getmir, yalnız düymə basılanda işə düşür. |
| **Kod blokunu işə salmaq** | Bu maşında quraşdırılmış dildə hər çəpərə Run düyməsi. Nəticə blokun altında görünür. Sandbox yoxdur və iddia edilmir — kod sizin öz icazələrinizlə işləyir və heç vaxt öz-özünə işə düşmür. |
| **Sənədi kilidləmək** | Bitmiş və ya başqasının sənədində redaktəni bağlayır. Saxlamada da tətbiq olunur, ona görə avtosaxlama və «hamısını saxla» da ona hörmət edir. |
| **Yazı seriyası** | Statistika paneli yazdığınız günləri sayır. Dünən bitən seriya bu gün hələ sayılır. Qeyddə tarix və rəqəm var, fayl adı yox. |
| **Markdown kimi yapışdırmaq** | Buferdəki formatlı mətni önizləmənin boru xəttindən keçirir — başlıqlar, siyahılar və cədvəllər qalır, səhifənin naviqasiyası və altlığı qalmır. |
| **Formatlaşdırmanı təmizləmək** | Cavabı birmənalı olan dörd problemi düzəldir — yapışmış başlıq, tablar, artıq boşluqlar, bağlanmamış blok — mühakimə tələb edənlərə toxunmur. |
| **Kod blokunun dili** | Çəpərin dilini əmr palitrasından təyin edin, hətta hələ bağlamadığınız blokda da. Siyahı vurğulayıcının öz cədvəlindən gəlir. |

Hər şeydə əvvəlcə oflayn. MarkCraft öz təşəbbüsü ilə heç bir şəbəkə sorğusu
göndərmir: nə telemetriya, nə yeniləmə yoxlaması, nə də iş vaxtı yüklənən şrift.

Yeganə istisna AI köməkçisidir — və bu, özünüzün etməli olduğunuz istisnadır.
Söndürülmüş, açarsız və standart ünvansız gəlir. Siz provayder qoşub onu
aktivləşdirənə qədər yazdığınız heç nə bu kompüterdən çıxmır. Aktivləşdirəndə
isə proqram göndərməzdən əvvəl nə göndərəcəyini sizə göstərir.

---

## Başlanğıc

```bash
npm install
npm run dev
```

`npm run dev` renderer üçün hot reload ilə Vite-ı başladır və dəyişiklikdə main
prosesini yenidən işə salır.

### Digər skriptlər

| Skript | Məqsəd |
|---|---|
| `npm run dev` | HMR ilə işləmə rejimi |
| `npm run build` | Tip yoxlaması, sonra hər üç paketin `out/` içinə qurulması |
| `npm start` | Qurulmuş proqramı işə sal |
| `npm test` | Vitest testlərini işə sal |
| `npm run lint` | ESLint — arxitektura sərhəd qaydaları daxil |
| `npm run typecheck` | main/preload və renderer layihələrinin tip yoxlaması |
| `npm run package` | `release/` içinə paketlənməmiş proqram qur |
| `npm run dist` | Cari platforma üçün quraşdırıcılar qur |

Node 20 və ya daha yenisi tələb olunur.

---

## Klaviatura qısayolları

Seçmə siyahı — tam siyahı və dəyişdirmə **Parametrlər → Klaviatura** bölməsindədir,
hər şey isə əmr paletindən əlçatandır.

| Əməliyyat | Qısayol |
|---|---|
| Əmr paleti | `Ctrl/Cmd + Shift + P` |
| Yeni / Aç / Saxla | `Ctrl/Cmd + N` / `O` / `S` |
| Fərqli saxla | `Ctrl/Cmd + Shift + S` |
| Qovluq aç | `Ctrl/Cmd + Shift + O` |
| Tabı bağla / Bağlananı aç | `Ctrl/Cmd + W` / `Ctrl/Cmd + Shift + T` |
| Tap / Əvəz et | `Ctrl/Cmd + F` / `Ctrl/Cmd + H` |
| İş sahəsində axtar | `Ctrl/Cmd + Shift + F` |
| Sətrə keç | `Ctrl/Cmd + G` |
| Qalın / Maili / Sətirdaxili kod | `Ctrl/Cmd + B` / `I` / `E` |
| Keçid əlavə et | `Ctrl/Cmd + K` |
| Başlıq 1–6 / Abzas | `Ctrl/Cmd + 1…6` / `Ctrl/Cmd + 0` |
| Görünüş rejimini dəyiş | `Ctrl/Cmd + Shift + V` |
| Yan paneli göstər/gizlət | `Ctrl/Cmd + Alt + B` |
| Mövzunu dəyiş | `Ctrl/Cmd + Shift + D` |
| Çap / İxrac | `Ctrl/Cmd + P` / `Ctrl/Cmd + Alt + E` |
| Oxuma rejimi | `Ctrl/Cmd + Shift + R` |
| Struktur | `Ctrl/Cmd + Shift + U` |
| Şablondan yeni | `Ctrl/Cmd + Alt + N` |
| Parametrlər | `Ctrl/Cmd + ,` |
| İnterfeys böyüt / kiçilt / sıfırla | `Ctrl/Cmd + =` / `Ctrl/Cmd + -` / `Ctrl/Cmd + Alt + 0` |
| Təqdimat rejimi | `F5` |
| Tərtibatçı alətləri | `Ctrl/Cmd + Alt + T` |
| Keçidlər və qraf | `Ctrl/Cmd + Alt + L` |
| Vebsayt görünüşü | `Ctrl/Cmd + Alt + W` |
| Emoji əlavə et | `Ctrl/Cmd + Alt + M` |
| Kitab | `Ctrl/Cmd + Alt + K` |

---

## Sənədləşmə

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — proqramın necə və nə üçün belə
  qurulduğu: sənəd modeli, gediş-gəliş siyasəti, IPC müqaviləsi, təhlükəsizlik
  modeli və performans qərarları.
- **[DEVELOPMENT.md](DEVELOPMENT.md)** — kod bazası üzərində iş: layihə quruluşu,
  konvensiyalar, əmr və ya parametr necə əlavə olunur, testlər və problemlərin
  həlli.

---

## Zəngin redaktor haqqında qeyd

Markdown sənəd ağacının kanonik seriallaşdırılması deyil — `*em*` və `_em_` eyni
cür oxunur, `# Başlıq` və setext altxətli başlıq da eyni. Ona görə AST üzərindən
gediş-gəliş edən istənilən WYSIWYG redaktor istifadəçinin toxunmadığı mətni
yenidən yazacaq.

MarkCraft bunu gizlətməyə çalışmaq əvəzinə açıq şəkildə həll edir:

- Markdown mətni yeganə həqiqət mənbəyidir; redaktorlar onun üzərindəki
  görünüşlərdir.
- Yalnız fokuslanmış səth idarə edir, qalanları izləyir. İkitərəfli bağlama yoxdur.
- Zəngin redaktor hər klavişdə yox, ötürmə anında yenidən seriallaşdırır — yəni
  mənbə rejimində qalan istifadəçi formatının dəyişdiyini heç vaxt görmür.
- Seriallaşdırma üslubu görünən bir parametrdir, və zəngin redaktorun düzləşdirəcəyi
  konstruksiyaları olan sənədlər redaktədən əvvəl bunu bildirir.

Tam izahı: [ARCHITECTURE.md](ARCHITECTURE.md#document-model).

---

## Lisenziya

MIT
