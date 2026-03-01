type SlugOptions = {
  separator?: '-' | '_';
  lowercase?: boolean;
};

export const generateSlug = (value: string, options: SlugOptions = {}) => {
  const { separator = '-', lowercase = true } = options;

  const sanitized = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, separator)
    .replace(/_+/g, separator)
    .replace(/-+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');

  return lowercase ? sanitized.toLowerCase() : sanitized;
};
