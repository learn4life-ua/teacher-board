export const MAX_TEXT_LENGTH = 20000;
export const MAX_GRAPH_EXPRESSION_LENGTH = 300;
export const MAX_PAGES = 100;
export const MAX_STROKES_PER_PAGE = 5000;
export const MAX_POINTS_PER_STROKE = 12000;
export const MAX_OBJECTS_PER_PAGE = 800;
export const MAX_INSTRUMENTS_PER_PAGE = 40;
export const MAX_IMAGE_DATA_URL_LENGTH = 5000000;

export function limitText(value,max,fallback=''){
  const text=String(value??fallback);
  return text.length>max?text.slice(0,max):text;
}
