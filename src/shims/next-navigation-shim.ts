export function useParams() {
  return {};
}

export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    prefetch: () => Promise.resolve(),
    pathname: '',
    query: {},
    asPath: '',
  };
}

export function usePathname() {
  return '';
}

export function useSearchParams() {
  return new URLSearchParams();
}
