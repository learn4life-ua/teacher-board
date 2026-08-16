export const MAX_TEXT_LENGTH = 20000;
export const MAX_GRAPH_EXPRESSION_LENGTH = 300;

export function limitText(value,max,fallback=''){
  const text=String(value??fallback);
  return text.length>max?text.slice(0,max):text;
}
