import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSubdomains } from './server/actions/getsubdomains';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) auth().protect();

  const url = req.nextUrl;
  const hostname = req.headers.get("host");
  const subdomains = await getSubdomains() as { subdomain: string; }[];

  console.log(subdomains); // Check the console output to see what's being returned

  try {
    // Define los dominios permitidos (localhost y dominio para producción)
    // Define allowed Domains (localhost and production domain)
    const allowedDomains = ["localhost:3000", "cms.shotoo.tech"];

    // Verificamos si el hostname existe en los dominios permitidos
    // Verify if hostname exist in allowed domains
    const isAllowedDomain = hostname && allowedDomains.some(domain => hostname.includes(domain));

    // Extraemos el posible subdominio en la URL
    // Extract the possible subdomain in the URL
    const subdomain = hostname ? hostname.split('.')[0] : '';

    // Si estamos en un dominio habilitado y no es un subdominio, permitimos la solicitud.
    // If we stay in a allowed domain and its not a subdomain, allow the request.
    if (isAllowedDomain && !subdomains?.some((d: { subdomain: string; }) => d.subdomain === subdomain)) {
      return NextResponse.next();
    }

    const subdomainData = subdomains?.find(d => d.subdomain === subdomain);

    if (subdomainData) {
      // Rewrite the URL in the dynamic route based in the subdomain
      // Reescribe la URL a una ruta dinámica basada en el subdominio
      return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, req.url));
    }
    if (!subdomainData) {
      // Redirect to the main domain if the subdomain doesn't exist
      return NextResponse.redirect(new URL(`https://${allowedDomains[0]}${url.pathname}`, req.url));
    }
  } catch (error) {
    console.error(error);
    // Handle the error accordingly
  }

  return new Response(null, { status: 404 });
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};