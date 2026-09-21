// /old shares today's content and functionality, with the pre-contrast CSS.
export const OLD_DESIGN = typeof window !== 'undefined'
  && window.location.pathname.replace(/\/+$/, '') === '/old'
