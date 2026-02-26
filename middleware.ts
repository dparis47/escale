import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isConnecte = !!req.auth
  const estPageLogin = req.nextUrl.pathname === '/login'

  if (!isConnecte && !estPageLogin) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isConnecte && estPageLogin) {
    return NextResponse.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
