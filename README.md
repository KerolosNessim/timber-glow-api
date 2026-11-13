# timber-glow-api

الباك إند لمتجر Timber Glow والداشبورد: Express + MongoDB (Mongoose) + Cloudinary، وبيترفع على Vercel.

## التشغيل محلياً
1. `npm install`
2. انسخ `.env.example` لـ `.env` واملا القيم (تفاصيلها تحت).
3. `npm run seed`: ينقل بيانات المتجر الوهمية (`../timber-glow-react/src/mocks/data`) للداتابيز. `npm run seed -- --force` يمسح ويعيد.
4. `npm run dev`: الـ API على `http://localhost:3000`.

## المتغيرات (`.env` محلياً، وEnvironment Variables على Vercel)

| المتغير | إيه هو |
|---|---|
| `MONGODB_URI` | رابط MongoDB Atlas، وفي آخره اسم الداتابيز: `…mongodb.net/timber-glow` |
| `JWT_SECRET` | نص عشوائي طويل: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAIL` | إيميل دخول الداشبورد |
| `ADMIN_PASSWORD_HASH` | `npm run hash-password -- "الباسورد"` وحط الناتج هنا (بين `'…'` في ملف `.env`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | من Cloudinary ← Settings ← API Keys |
| `CORS_ORIGIN` | محلياً `http://localhost:5173`. على Vercel مش لازم، لأن المتجر بيكلّم الـ API من خلال `/api` على نفس الدومين |

## Endpoints

كل الردود بالشكل `{ data }`، والأخطاء `{ error }`.

**عامة:**
- `GET /home`، `GET /categories`، `GET /categories/:slug`، `GET /products`، `GET /products/:id`، `GET /settings`
- `POST /orders`: بيحسب الأسعار من الداتابيز، وبيتأكد إن المقاسات متاحة، وبيرجّع `{ number, subtotal, whatsappUrl }`. لو فيه حاجة خلصت بيرجع 409 ومعاه `unavailable`.

**الداشبورد** (محتاجة تسجيل دخول، cookie اسمها `tg_admin`):
- `POST /admin/login`، `POST /admin/logout`، `GET /admin/me`
- `/admin/products`، `/admin/categories` (فيها `PUT /admin/categories/order`): إضافة وتعديل وحذف وعرض
- `GET /admin/orders?status=&q=&from=&to=&page=`، `GET/PATCH /admin/orders/:number`
  - التأكيد (أو اتشحن / اتسلّم) بيخصم المخزون جوه transaction، والإلغاء أو الرجوع لـ «جديد» بيرجّعه.
- `GET /admin/stats`
- `GET/PUT /admin/home`، `GET/PUT /admin/settings`
- `POST /admin/uploads/sign`: توقيع عشان المتصفح يرفع الصورة على Cloudinary مباشرة.
  - **محلياً من غير Cloudinary:** بيرجّع `mode: "local"`، والصورة بتترفع على `POST /admin/uploads/local` وبتتحفظ في فولدر `uploads/`. على Vercel لازم Cloudinary.
  - الصور القديمة بتتمسح من Cloudinary لما المنتج أو القسم أو الصفحة تتحفظ من غيرها، أو تتحذف.

## الرفع على Vercel
1. **MongoDB Atlas:** cluster مجاني M0.
   - Database Access: اعمل يوزر.
   - Network Access: `0.0.0.0/0` (لأن IPs بتاعة Vercel متغيرة).
   - خد الـ connection string.
2. **Cloudinary:** حساب مجاني، وخد الـ cloud name والـ API key والـ secret.
3. ارفع الريبو ده على GitHub، وفي Vercel اعمل **New Project** واختاره. مفيش build command.
4. حط كل المتغيرات اللي فوق في Settings ← Environment Variables، وبعدين Redeploy.
5. شغّل الـ seed مرة واحدة من جهازك على داتابيز Atlas: حط `MONGODB_URI` بتاع Atlas في `.env` وشغّل `npm run seed`.
6. افتح `https://<اسم-المشروع>.vercel.app/health`، المفروض يرجّع `{"ok":true}`.
7. حط الرابط ده في `vercel.json` بتاع المتجر (أول rewrite)، لو كان مختلف عن `https://timber-glow-api.vercel.app`.

> ⚠️ خطة Vercel المجانية (Hobby) للاستخدام غير التجاري. لما المتجر يبدأ يبيع فعلياً، انقل لـ Pro، أو ارفع الـ API على Render أو Railway (الكود هو هو، بيشتغل بـ `npm run dev` أو `tsx src/server.ts`).
