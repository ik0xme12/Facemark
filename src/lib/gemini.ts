import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function imageToBase64Part(dataUrl: string) {
  const [header, data] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  return { inlineData: { data, mimeType } };
}

export interface Anuncio {
  titulo: string;
  descripcionCorta: string;
  descripcionNormal: string;
  descripcionDetallada: string;
  precioSugerido: string;
  categoria: string;
  condicion: string;
  etiquetas: string[];
  consejosFoto: string[];
}

export interface Valuacion {
  producto: string;
  descripcion: string;
  precioMinimo: string;
  precioMaximo: string;
  precioRecomendado: string;
  nivelDemanda: 'Alta' | 'Media' | 'Baja';
  factores: string[];
  consejo: string;
}

export async function generarAnuncio(imageDataUrl: string): Promise<Anuncio> {
  const prompt = `Eres un experto en ventas de Facebook Marketplace en México (CDMX).
Analiza esta imagen y genera un anuncio completo para vender este producto.
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "titulo": "título atractivo máximo 60 caracteres",
  "descripcionCorta": "descripción breve 1-2 oraciones",
  "descripcionNormal": "descripción normal 3-4 oraciones con detalles importantes",
  "descripcionDetallada": "descripción detallada completa con todas las características, estado, medidas si aplica, etc.",
  "precioSugerido": "precio en pesos mexicanos solo el número ej: 450",
  "categoria": "categoría de Marketplace ej: Electrónica, Ropa y accesorios, Hogar, Vehículos, etc.",
  "condicion": "Nuevo, Como nuevo, Buen estado, o Usado",
  "etiquetas": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5"],
  "consejosFoto": ["consejo1 para mejorar la foto", "consejo2", "consejo3"]
}`;

  const result = await model.generateContent([prompt, imageToBase64Part(imageDataUrl)]);
  const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(text) as Anuncio;
}

export async function valuarProducto(imageDataUrl: string): Promise<Valuacion> {
  const prompt = `Eres un experto valuador de productos para Facebook Marketplace en México (CDMX).
Analiza esta imagen e identifica el producto y su valor de mercado actual en CDMX.
Considera precios típicos de Marketplace México, MercadoLibre México y tianguis digitales.
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "producto": "nombre del producto identificado",
  "descripcion": "breve descripción del producto visto en la imagen",
  "precioMinimo": "precio mínimo en pesos solo número ej: 200",
  "precioMaximo": "precio máximo en pesos solo número ej: 500",
  "precioRecomendado": "precio ideal para vender rápido en pesos solo número ej: 350",
  "nivelDemanda": "Alta, Media, o Baja",
  "factores": ["factor que afecta el precio 1", "factor 2", "factor 3"],
  "consejo": "consejo clave para vender este producto en CDMX"
}`;

  const result = await model.generateContent([prompt, imageToBase64Part(imageDataUrl)]);
  const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(text) as Valuacion;
}
