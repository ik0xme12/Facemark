import { useState, useRef, useCallback } from 'react';
import { generarAnuncio, valuarProducto, type Anuncio, type Valuacion } from './lib/gemini';

type Modo = 'anuncio' | 'valuacion';
type HistorialItem =
  | { tipo: 'anuncio'; fecha: string; imagen: string; resultado: Anuncio }
  | { tipo: 'valuacion'; fecha: string; imagen: string; resultado: Valuacion };

function compressImage(dataUrl: string, maxW = 1024, maxH = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

export default function App() {
  const [modo, setModo] = useState<Modo>('anuncio');
  const [imagen, setImagen] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [valuacion, setValuacion] = useState<Valuacion | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [verHistorial, setVerHistorial] = useState(false);
  const [descMode, setDescMode] = useState<'corta' | 'normal' | 'detallada'>('normal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagen(e.target?.result as string);
      setAnuncio(null);
      setValuacion(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  }, [handleFile]);

  const analizar = async () => {
    if (!imagen) return;
    setCargando(true);
    setError(null);
    try {
      const compressed = await compressImage(imagen);
      const fecha = new Date().toLocaleString('es-MX');
      if (modo === 'anuncio') {
        const result = await generarAnuncio(compressed);
        setAnuncio(result);
        setHistorial(prev => [{ tipo: 'anuncio' as const, fecha, imagen: compressed, resultado: result }, ...prev].slice(0, 20));
      } else {
        const result = await valuarProducto(compressed);
        setValuacion(result);
        setHistorial(prev => [{ tipo: 'valuacion' as const, fecha, imagen: compressed, resultado: result }, ...prev].slice(0, 20));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
    } finally {
      setCargando(false);
    }
  };

  const copiar = (texto: string) => navigator.clipboard.writeText(texto);

  const demandaColor = (nivel: string) => {
    if (nivel === 'Alta') return 'bg-green-100 text-green-800';
    if (nivel === 'Media') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="min-h-screen bg-fb-bg">
      {/* Header */}
      <header className="bg-fb-blue shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-fb-blue font-bold text-sm">F</span>
            </div>
            <span className="text-white font-bold text-lg">Facemark</span>
          </div>
          <button
            onClick={() => setVerHistorial(true)}
            className="text-white/80 hover:text-white text-sm flex items-center gap-1"
          >
            <span>📋</span> Historial ({historial.length})
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Mode toggle */}
        <div className="bg-white rounded-xl shadow-sm p-1 flex gap-1">
          <button
            onClick={() => { setModo('anuncio'); setAnuncio(null); setValuacion(null); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              modo === 'anuncio' ? 'bg-fb-blue text-white shadow' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            📝 Generar Anuncio
          </button>
          <button
            onClick={() => { setModo('valuacion'); setAnuncio(null); setValuacion(null); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              modo === 'valuacion' ? 'bg-fb-blue text-white shadow' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            💰 Valuar Producto
          </button>
        </div>

        {/* Upload zone */}
        <div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {imagen ? (
            <div className="relative">
              <img src={imagen} alt="Producto" className="w-full max-h-72 object-contain bg-gray-50" />
              <button
                onClick={() => { setImagen(null); setAnuncio(null); setValuacion(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 m-3 rounded-xl">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-gray-500 text-sm mb-4">Sube una foto del producto</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => camaraRef.current?.click()}
                  className="bg-fb-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-fb-dark"
                >
                  Cámara
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-fb-light text-fb-blue px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100"
                >
                  Galería
                </button>
              </div>
              <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}
        </div>

        {/* Analyze button */}
        {imagen && (
          <button
            onClick={analizar}
            disabled={cargando}
            className="w-full bg-fb-blue text-white py-3.5 rounded-xl font-bold text-base hover:bg-fb-dark disabled:opacity-60 disabled:cursor-not-allowed shadow transition-all"
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analizando con IA...
              </span>
            ) : (
              modo === 'anuncio' ? '✨ Generar Anuncio' : '💰 Valuar Producto'
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Anuncio result */}
        {anuncio && (
          <div className="space-y-3 animate-fade-in">
            {/* Title + price */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="font-bold text-gray-900 text-lg leading-tight">{anuncio.titulo}</h2>
                <button onClick={() => copiar(anuncio.titulo)} className="text-gray-400 hover:text-fb-blue text-xs shrink-0">📋</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="bg-green-100 text-green-800 font-bold text-base px-3 py-1 rounded-full">
                  ${anuncio.precioSugerido} MXN
                </span>
                <span className="bg-fb-light text-fb-blue text-sm px-3 py-1 rounded-full">{anuncio.categoria}</span>
                <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">{anuncio.condicion}</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Descripción</h3>
                <button onClick={() => copiar(
                  descMode === 'corta' ? anuncio.descripcionCorta :
                  descMode === 'normal' ? anuncio.descripcionNormal : anuncio.descripcionDetallada
                )} className="text-gray-400 hover:text-fb-blue text-xs">📋 Copiar</button>
              </div>
              <div className="flex gap-1 mb-3">
                {(['corta', 'normal', 'detallada'] as const).map(m => (
                  <button key={m} onClick={() => setDescMode(m)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                      descMode === m ? 'bg-fb-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {m === 'corta' ? 'Corta' : m === 'normal' ? 'Normal' : 'Detallada'}
                  </button>
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                {descMode === 'corta' ? anuncio.descripcionCorta :
                 descMode === 'normal' ? anuncio.descripcionNormal : anuncio.descripcionDetallada}
              </p>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Etiquetas</h3>
              <div className="flex flex-wrap gap-2">
                {anuncio.etiquetas.map((tag, i) => (
                  <span key={i} className="bg-fb-light text-fb-blue text-sm px-2.5 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            </div>

            {/* Photo tips */}
            {anuncio.consejosFoto.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-800 mb-2">💡 Consejos para la foto</h3>
                <ul className="space-y-1">
                  {anuncio.consejosFoto.map((c, i) => (
                    <li key={i} className="text-amber-700 text-sm flex gap-2">
                      <span className="shrink-0">•</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Copy all + open marketplace */}
            <div className="flex gap-2">
              <button
                onClick={() => copiar(`${anuncio.titulo}\n\n${anuncio.descripcionDetallada}\n\nPrecio: $${anuncio.precioSugerido} MXN\nCondición: ${anuncio.condicion}\n\n${anuncio.etiquetas.map(t => '#' + t).join(' ')}`)}
                className="flex-1 bg-white border border-fb-blue text-fb-blue py-3 rounded-xl font-semibold text-sm hover:bg-fb-light"
              >
                📋 Copiar todo
              </button>
              <a
                href="https://www.facebook.com/marketplace/create/item"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-fb-blue text-white py-3 rounded-xl font-semibold text-sm text-center hover:bg-fb-dark"
              >
                Abrir Marketplace
              </a>
            </div>
          </div>
        )}

        {/* Valuacion result */}
        {valuacion && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h2 className="font-bold text-gray-900 text-lg">{valuacion.producto}</h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${demandaColor(valuacion.nivelDemanda)}`}>
                  Demanda {valuacion.nivelDemanda}
                </span>
              </div>
              <p className="text-gray-500 text-sm">{valuacion.descripcion}</p>
            </div>

            {/* Price range */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Rango de precios</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="text-xs text-red-600 font-medium mb-1">Mínimo</div>
                  <div className="text-red-700 font-bold text-base">${valuacion.precioMinimo}</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 ring-2 ring-green-400">
                  <div className="text-xs text-green-600 font-medium mb-1">Recomendado</div>
                  <div className="text-green-700 font-bold text-xl">${valuacion.precioRecomendado}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-xs text-blue-600 font-medium mb-1">Máximo</div>
                  <div className="text-blue-700 font-bold text-base">${valuacion.precioMaximo}</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">Precios en MXN · Marketplace CDMX</p>
            </div>

            {/* Factors */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Factores que afectan el precio</h3>
              <ul className="space-y-1">
                {valuacion.factores.map((f, i) => (
                  <li key={i} className="text-gray-600 text-sm flex gap-2">
                    <span className="shrink-0 text-fb-blue">•</span>{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tip */}
            <div className="bg-fb-light border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-fb-blue mb-1">💡 Consejo para vender</h3>
              <p className="text-blue-800 text-sm">{valuacion.consejo}</p>
            </div>

            <a
              href="https://www.facebook.com/marketplace/create/item"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-fb-blue text-white py-3 rounded-xl font-bold text-sm text-center hover:bg-fb-dark"
            >
              Publicar en Marketplace
            </a>
          </div>
        )}
      </main>

      {/* Historial modal */}
      {verHistorial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setVerHistorial(false)}>
          <div className="bg-white w-full max-h-[80vh] rounded-t-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-bold text-gray-900">Historial</h2>
              <button onClick={() => setVerHistorial(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {historial.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Sin análisis aún</p>
              ) : (
                historial.map((item, i) => (
                  <div key={i} className="flex gap-3 p-4 border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (item.tipo === 'anuncio') { setModo('anuncio'); setAnuncio(item.resultado); setValuacion(null); }
                      else { setModo('valuacion'); setValuacion(item.resultado); setAnuncio(null); }
                      setImagen(item.imagen);
                      setVerHistorial(false);
                    }}>
                    <img src={item.imagen} className="w-14 h-14 object-cover rounded-lg shrink-0" alt="" />
                    <div className="min-w-0">
                      <div className="flex gap-2 items-center mb-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.tipo === 'anuncio' ? 'bg-fb-light text-fb-blue' : 'bg-green-100 text-green-700'}`}>
                          {item.tipo === 'anuncio' ? 'Anuncio' : 'Valuación'}
                        </span>
                        <span className="text-xs text-gray-400">{item.fecha}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.tipo === 'anuncio' ? item.resultado.titulo : item.resultado.producto}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.tipo === 'anuncio' ? `$${item.resultado.precioSugerido} MXN` : `$${item.resultado.precioRecomendado} MXN recomendado`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
