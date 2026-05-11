export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export const siteUrl = (path = "") => {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://nexura.ca";
  return new URL(path, origin).toString();
};
