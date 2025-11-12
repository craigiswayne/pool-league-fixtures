/**
 *
 * @param text {string}
 */
export const slugify = (text) => {
    return text.toLowerCase().replace(/\s/g, '-');
}
