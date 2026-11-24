# المكتب — The Office MVP

منصة عمل افتراضية عربية (RTL) تجمع الشركة والأقسام والمشاريع والمهام والمحادثات في مساحة واحدة.

## التقنية
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Supabase Auth + PostgreSQL + RLS
- Vercel للاستضافة

## التشغيل المحلي
1. استخدم Node.js 22 أو أحدث.
2. انسخ `.env.example` إلى `.env.local`.
3. أضف رابط مشروع Supabase ومفتاح Publishable من لوحة المشروع.
4. نفّذ:
   ```bash
   npm install
   npm run dev
   ```
5. افتح http://localhost:3000

## متغيرات البيئة
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (محليًا http://localhost:3000)

لا تضع أبدًا `service_role` أو Secret key في متغير يبدأ بـ `NEXT_PUBLIC_` أو في كود المتصفح.

## ما تم تأسيسه
- واجهة تعريفية عربية RTL.
- إنشاء حساب وتسجيل دخول بالبريد وكلمة المرور.
- جلسات Supabase SSR عبر cookies وNext.js Proxy.
- إنشاء شركة وربط منشئها بدور Owner من خلال RPC بصلاحيات invoker وسياسات RLS.
- جداول الشركات والأعضاء والأقسام والمشاريع والمهام والرسائل والإشعارات.
- عزل بيانات الشركات بسياسات Row Level Security.

## النطاق
هذه هي قاعدة MVP. الاجتماعات المرئية، السوق، الاستكشاف الاجتماعي، والهدايا خارج النطاق الحالي.
