export const IS_DEV = import.meta.env.DEV
export const API_URL = IS_DEV ? "http://localhost:5000" : "PROD_URL"
