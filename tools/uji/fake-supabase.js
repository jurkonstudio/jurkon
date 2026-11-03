// Klien Supabase TIRUAN untuk tools/uji-browser.js: semua kueri mengembalikan data kosong tanpa galat. Bukan untuk produksi.
(function(){
  const hasil = () => ({ data: [], error: null, count: 0 });
  function rantai() {
    const f = function(){};
    return new Proxy(f, {
      get(_, k) {
        if (k === 'then') return (ok, ng) => Promise.resolve(hasil()).then(ok, ng);
        if (k === 'catch') return ng => Promise.resolve(hasil()).catch(ng);
        if (k === 'finally') return fn => Promise.resolve(hasil()).finally(fn);
        return rantai();
      },
      apply() { return rantai(); }
    });
  }
  const sesi = window.__SESI__ || null;
  const user = sesi && sesi.user;
  const auth = {
    getSession: async () => ({ data: { session: sesi }, error: null }),
    getUser: async () => ({ data: { user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
    signOut: async () => ({ error: null }), signInWithPassword: async () => ({ data: {}, error: { message: 'x' } }),
    signUp: async () => ({ data: {}, error: { message: 'x' } }), resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ data: {}, error: null }), setSession: async () => ({ data: {}, error: null }),
    mfa: new Proxy({}, { get: () => async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1', totp: [], all: [] }, error: null }) }),
  };
  const kanal = () => { const c = { on() { return c; }, subscribe() { return c; }, unsubscribe() {} }; return c; };
  window.supabase = { createClient() {
    return { auth, from: () => rantai(), rpc: () => rantai(), channel: kanal, removeChannel() {},
      storage: { from: () => new Proxy({}, { get: () => async () => ({ data: null, error: null }) }) },
      functions: { invoke: async () => ({ data: null, error: null }) } };
  } };
})();
