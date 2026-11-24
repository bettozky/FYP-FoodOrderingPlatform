// Password rule (the server checks the same rule): at least 8 characters, at least 1 number and 1 symbol.
// A symbol is anything that is not a letter, a number or a space, e.g. ! @ # $ _ -
export function passwordChecks(pw: string) {
  return {
    length: [...pw].length >= 8,
    number: /[0-9]/.test(pw),
    symbol: /[^\p{L}\p{N}\s]/u.test(pw),
  };
}
export function passwordOk(pw: string) {
  const c = passwordChecks(pw);
  return c.length && c.number && c.symbol;
}
