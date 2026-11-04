# ابدأ من هنا – تعليمات تشغيل المشروع

هذا هو المشروع الكامل الخاص بامتحان Programmazione Avanzata. ملف `README.md` مكتوب بالإيطالية لتقديمه للأستاذ، أما هذا الملف فيشرح لك التشغيل بالعربية.

## 1. فك الضغط

1. فك ضغط الملف `connect-four-exam-project.zip`.
2. افتح مجلد `connect-four-exam-project` بواسطة VS Code.
3. افتح Terminal من VS Code واختر PowerShell.

## 2. تجهيز المشروع

نفّذ الأوامر بالترتيب:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run generate:keys:if-missing
npm.cmd run seed
```

شرح الأوامر:

- `Copy-Item`: ينشئ ملف الإعدادات `.env` انطلاقاً من النموذج.
- `npm.cmd install`: يثبت المكتبات المطلوبة، ومنها Express وSequelize وSQLite وconnect4-ai وPDFKit.
- `generate:keys:if-missing`: ينشئ مفتاحاً خاصاً ومفتاحاً عاماً ويحفظهما مباشرة داخل `.env` في المتغيرين `JWT_PRIVATE_KEY` و`JWT_PUBLIC_KEY` لتوقيع JWT بواسطة RS256.
- `seed`: ينشئ قاعدة البيانات والمستخدم Admin ومستخدمين عاديين للاختبار.

إذا ظهرت رسالة تطلب السماح بتشغيل install scripts الخاصة بـ sqlite3 أو esbuild، فلا توافق على أي أمر لا تعرفه. في هذا المشروع، sqlite3 يحتاج أحياناً إلى بناء native module؛ نفّذ تعليمات npm الظاهرة بعد مراجعتها.

## 3. تشغيل السيرفر

```powershell
npm.cmd run dev
```

افتح Postman وأرسل:

- Method: `GET`
- URL: `http://localhost:3000/health`

النتيجة الصحيحة:

```json
{
  "status": "ok",
  "service": "connect-four-backend"
}
```

اترك نافذة السيرفر مفتوحة أثناء استعمال Postman.

## 4. حسابات التجربة

الحسابات الأولية الافتراضية التي ينشئها Seed:

| الحساب | البريد | كلمة المرور |
|---|---|---|
| Admin | admin@example.com | ChangeMe_Admin_2026! |
| Alice | alice@example.com | ChangeMe_User_2026! |
| Bob | bob@example.com | ChangeMe_User_2026! |

يمكن تغيير كلمات المرور من ملف `.env` قبل تشغيل `npm.cmd run seed`. لا ترفع ملف `.env` إلى GitHub لأنه يحتوي المفتاح الخاص.

## 5. تجربة اللعبة من Postman

1. من Postman اختر Import.
2. اختر الملف `postman/Connect-Four-Exam.postman_collection.json`.
3. افتح Collection Variables وتأكد من أن `baseUrl` هو `http://localhost:3000`.
4. شغّل `Login user (save token)`. سيحفظ Postman الـ JWT في المتغير `userToken`.
5. شغّل `Create Human vs AI` لإنشاء مباراة.
6. احفظ رقم المباراة الذي يظهر في الاستجابة داخل المتغير `gameId`.
7. شغّل `Make move (0 to 6)` لتجربة حركة.
8. شغّل `Get game state` لمشاهدة اللوحة والحركات واللاعب الذي عليه الدور.
9. جرّب `Game history JSON` و`Game history PDF`.
10. لاختبار Admin شغّل `Admin login (save token)` ثم `Admin set new credit balance`.

## 6. اختبارات المشروع

أوقف السيرفر باستخدام `Ctrl + C` أو افتح Terminal آخر، ثم نفّذ:

```powershell
npm.cmd run build
npm.cmd test
```

الـ tests تشمل Middleware المصادقة JWT، وصلاحية Admin، وفحص الرصيد، وقواعد Connect Four الأساسية.

## 7. قبل التسليم للأستاذ

- تأكد أن `npm.cmd run build` ناجح.
- تأكد أن `npm.cmd test` ناجح.
- اختبر Human-vs-Human بحساب Alice ثم تسجيل الدخول بحساب Bob وإجراء حركة اللاعب الثاني.
- اختبر المؤقت بتحديد `turnTimeSeconds` بقيمة صغيرة، وانتظر انتهاء المهلة.
- اختبر PDF وJSON وLeaderboard وAdmin recharge.
- راجع `README.md` ومخططات UML في `docs/uml/`.
- ارفع المجلد إلى GitHub كمستودع Public.
- انسخ رابط المستودع وCommit SHA إلى Moodle.

**ملاحظة مهمة:** لم أتمكن من تثبيت الحزم أو تشغيل TypeScript/Jest داخل بيئة إنشاء الملف لأن الوصول إلى npm registry كان غير متاح وقت الإنشاء. لذلك يجب تنفيذ أوامر البناء والاختبارات محلياً بعد `npm install`، وإرسال أي خطأ يظهر في Terminal حتى نصححه قبل التسليم. لا تعتبر المشروع جاهزاً للتسليم النهائي قبل اجتياز هذه الاختبارات على جهازك.
