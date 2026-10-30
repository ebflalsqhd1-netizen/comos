// CCOMOS 웹사이트 공용: Firebase 로그인·회원 정보·사이트 설정
// (공개되어도 되는 웹 설정값. 실제 보호는 Firestore 보안 규칙이 담당)
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDtXRG1_6joTrsUFzW1YMoPbhISJD64us0',
  authDomain: 'livestudio-895d7.firebaseapp.com',
  projectId: 'livestudio-895d7',
  storageBucket: 'livestudio-895d7.firebasestorage.app',
  messagingSenderId: '667770499264',
  appId: '1:667770499264:web:9a5ad4f2c1719e8378bd25',
};
export const ADMIN_UIDS = ['JZXJBaKcabUN8f0luTrdUndNykU2'];
const V = '13.1.0';

// 기본 요금제 (관리자 페이지에서 바꾸면 Firestore config/plans 가 우선)
export const FEATURES = {
  pets_premium: '신비한 펫 8종 (드래곤·백호·유니콘 등)',
  voices_premium: '재미있는 TTS 목소리 전체',
  super_gift: '초대형 선물 연출',
  layout: '오버레이 배치 · 전체 위젯 링크',
  cloud_save: '설정 계정 저장',
};
export const DEFAULT_PLANS = {
  defaultPlan: 'beta',
  plans: [
    { id: 'beta', name: '베타', price: '0원', period: '', desc: '지인 베타 · 모든 기능 전부 무료', badge: '지금 무료', visible: true, highlight: true,
      features: { pets_premium: true, voices_premium: true, super_gift: true, layout: true, cloud_save: true } },
    { id: 'pro', name: '프로', price: '정식 출시 후 공개', period: '', desc: '정식 버전에서 안내할게요', badge: '준비중', visible: false,
      features: { pets_premium: true, voices_premium: true, super_gift: true, layout: true, cloud_save: true } },
  ],
};
export const DEFAULT_SITE = { inviteOnly: true, allowSignup: true, notice: '' };

let fb = null, loading = null;
export async function load() {
  if (fb) return fb;
  if (!loading) {
    loading = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${V}`;
      const [appMod, A, F] = await Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`)]);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      const auth = A.getAuth(app);
      auth.languageCode = 'ko';
      const db = F.getFirestore(app);
      fb = { app, auth, db, A, F };
      return fb;
    })();
    // 인터넷이 잠깐 끊겨 실패하면 다음 호출 때 다시 시도할 수 있게 비워 둠
    loading.catch(() => { loading = null; });
  }
  return loading;
}

export const isAdmin = (u) => Boolean(u && ADMIN_UIDS.includes(u.uid));

export async function signIn() {
  const f = await load();
  const p = new f.A.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return f.A.signInWithPopup(f.auth, p);
}
export async function signOut() { const f = await load(); return f.A.signOut(f.auth); }

export async function onUser(cb) {
  const f = await load();
  return f.A.onAuthStateChanged(f.auth, cb);
}

// 로그인한 사람의 회원 문서 (없으면 만들기)
export async function myProfile(user) {
  const { F, db } = await load();
  const ref = F.doc(db, 'users', user.uid);
  const base = { email: user.email || '', name: user.displayName || '', photo: user.photoURL || '', lastLoginAt: F.serverTimestamp() };
  const snap = await F.getDoc(ref);
  if (!snap.exists()) { await F.setDoc(ref, { ...base, createdAt: F.serverTimestamp(), app: 'site' }); return { ...base }; }
  F.updateDoc(ref, base).catch(() => {});
  return snap.data();
}

export async function apply(user, form) {
  const { F, db } = await load();
  await F.setDoc(F.doc(db, 'users', user.uid), {
    email: user.email || '', name: user.displayName || '', photo: user.photoURL || '',
    status: 'pending', appliedAt: F.serverTimestamp(),
    application: {
      tiktok: String(form.tiktok || '').replace(/^@/, '').trim().slice(0, 40),
      nickname: String(form.nickname || '').trim().slice(0, 40),
      referrer: String(form.referrer || '').trim().slice(0, 60),
      message: String(form.message || '').trim().slice(0, 500),
      agreedAt: new Date().toISOString(),
    },
  }, { merge: true });
}

export async function getConfig(name, fallback) {
  try {
    const { F, db } = await load();
    const snap = await F.getDoc(F.doc(db, 'config', name));
    return snap.exists() ? { ...fallback, ...snap.data() } : fallback;
  } catch { return fallback; }
}

export const STATUS = { pending: '승인 대기', approved: '승인됨', rejected: '거절됨', blocked: '이용 정지' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = (t) => { const d = t?.toDate ? t.toDate() : t ? new Date(t) : null; return d && !isNaN(d) ? d.toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'; };
