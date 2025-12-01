import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ⭐ AGGIUNGI QUESTO CSS PER LA STAMPA
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    
    #report-printable, #report-printable * {
      visibility: visible;
    }
    
    #report-printable {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    
    /* Nascondi toolbar e pulsanti */
    .print\\:hidden {
      display: none !important;
    }
  }
`;

// Aggiungi lo style nel document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = printStyles;
  document.head.appendChild(styleSheet);
}

// Componente ricorsivo per albero categorie
const CategorieTree = ({ categorie, selezionate, onToggle, livello = 0 }) => {
  const [espansi, setEspansi] = React.useState({});

  const toggleEspansione = (id) => {
    setEspansi({ ...espansi, [id]: !espansi[id] });
  };

  return (
    <div className="space-y-0.5">
      {categorie.map(cat => {
        const haFigli = cat.children && cat.children.length > 0;
        const isEspanso = espansi[cat.id];
        const isSelezionato = selezionate.includes(cat.id);

        return (
          <div key={cat.id}>
            {/* Riga categoria */}
            <div
              className="flex items-center hover:bg-gray-50 rounded"
              style={{ paddingLeft: `${livello * 16}px` }}
            >
              {/* Freccia espansione */}
              {haFigli && (
                <button
                  onClick={() => toggleEspansione(cat.id)}
                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 text-xs"
                >
                  {isEspanso ? '▼' : '▶'}
                </button>
              )}
              {!haFigli && <div className="w-5"></div>}

              {/* Checkbox */}
              <label className="flex items-center flex-1 py-1.5 px-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isSelezionato}
                  onChange={() => onToggle(cat.id)}
                  className="mr-2"
                />
                <span className={`${livello === 0 ? 'font-semibold text-gray-900' : livello === 1 ? 'font-medium text-gray-700' : 'text-gray-600'}`}>
                  {cat.nome}
                </span>
              </label>
            </div>

            {/* Figli (se espanso) */}
            {haFigli && isEspanso && (
              <CategorieTree
                categorie={cat.children}
                selezionate={selezionate}
                onToggle={onToggle}
                livello={livello + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const Rapporti = () => {
  // Stati
  const [tipoReport, setTipoReport] = useState('dettaglio-conto');
  const [filtri, setFiltri] = useState({
    dataInizio: new Date().getFullYear() + '-01-01',
    dataFine: new Date().getFullYear() + '-12-31',
    contoId: '',
    categoriaId: '',
    sottocategoriaId: '',
    microcategoriaId: '',
    tipiMovimento: { entrate: true, uscite: true }
  });

  const [conti, setConti] = useState([]);
  const [categorie, setCategorie] = useState([]);

  const [mostraAnteprima, setMostraAnteprima] = useState(false);
  const [datiReport, setDatiReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Stati per modali
  const [mostraModalPeriodo, setMostraModalPeriodo] = useState(false);
  const [mostraModalConti, setMostraModalConti] = useState(false);
  const [mostraModalCategorie, setMostraModalCategorie] = useState(false);
  const [periodoSelezionato, setPeriodoSelezionato] = useState('anno-corrente');
  const [contiSelezionati, setContiSelezionati] = useState([]);
  const [categorieSelezionate, setCategorieSelezionate] = useState([]);

  // Gestione periodo predefinito
  const periodi = [
    { value: 'mese-corrente', label: 'Mese corrente' },
    { value: 'settimana-corrente', label: 'Settimana corrente' },
    { value: 'settimana-precedente', label: 'Settimana precedente' },
    { value: 'ultimi-30-giorni', label: 'Ultimi 30 giorni' },
    { value: 'ultimi-12-mesi', label: 'Ultimi 12 mesi' },
    { value: 'mese-precedente', label: 'Mese precedente' },
    { value: 'trimestre-corrente', label: 'Trimestre corrente' },
    { value: 'trimestre-precedente', label: 'Trimestre precedente' },
    { value: 'anno-corrente', label: 'Anno corrente' },
    { value: 'anno-precedente', label: 'Anno precedente' },
    { value: 'anno-fiscale-corrente', label: 'Anno fiscale corrente' },
    { value: 'anno-fiscale-precedente', label: 'Anno fiscale precedente' },
    { value: 'mese-attuale-ad-oggi', label: 'Mese attuale ad oggi' },
    { value: 'trimestre-attuale-ad-oggi', label: 'Trimestre attuale ad oggi' },
    { value: 'anno-attuale-ad-oggi', label: 'Anno attuale ad oggi' },
    { value: 'personalizzato', label: 'Tutte le date' }
  ];

  // Carica conti e categorie all'avvio
  useEffect(() => {
    caricaConti();  // ✅ DECOMMENTA!
    caricaCategorie();
  }, []);

  const caricaConti = async () => {
    try {
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('ente_id');
      const response = await axios.get('/api/contabilita/registri', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Ente-Id': enteId
        }
      });
      setConti(response.data);
    } catch (error) {
      console.error('Errore caricamento conti:', error);
    }
  };

  const caricaCategorie = async () => {
    try {
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('ente_id');

      console.log('🔑 TOKEN:', token ? 'PRESENTE' : 'ASSENTE');
      console.log('🏛️ ENTE_ID:', enteId);

      const response = await axios.get('/api/contabilita/categorie', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Ente-Id': enteId
        }
      });

      console.log('📊 RESPONSE COMPLETA:', response.data);
      const data = response.data.categorie || [];
      console.log('📊 CATEGORIE RICEVUTE:', data);
      setCategorie(data);
    } catch (error) {
      console.error('❌ ERRORE:', error);
    }
  };

  // Costruisce albero gerarchico da array piatto
  const buildCategorieTree = (categorie) => {
    console.log('🌳 BUILD TREE - INPUT:', categorie);

    const map = {};
    const roots = [];

    // Crea mappa id -> categoria
    categorie.forEach(cat => {
      map[cat.id] = {
        ...cat,
        nome: cat.descrizione || cat.nome, // ✅ Usa descrizione come nome
        children: []
      };
    });

    console.log('🔍 PRIMA CATEGORIA:', categorie[0]);
    console.log('🔍 HA parent_id?', categorie[0]?.parent_id);

    // Collega padri e figli usando parent_id
    categorie.forEach(cat => {
      if (cat.parent_id && map[cat.parent_id]) {
        // Ha un padre valido → aggiungilo come figlio
        map[cat.parent_id].children.push(map[cat.id]);
      } else if (!cat.parent_id) {
        // Non ha padre → è una root
        roots.push(map[cat.id]);
      }
    });

    console.log('🌳 BUILD TREE - ROOTS:', roots.length);
    console.log('🌳 PRIMA ROOT:', roots[0]);

    return roots;
  };

  const applicaPeriodoPredefinito = (tipo) => {
    const oggi = new Date();
    const anno = oggi.getFullYear();
    const mese = oggi.getMonth(); // 0-11
    let inizio, fine;

    switch (tipo) {
      case 'mese-corrente':
        inizio = new Date(anno, mese, 1);
        fine = new Date(anno, mese + 1, 0);
        break;

      case 'mese-precedente':
        inizio = new Date(anno, mese - 1, 1);
        fine = new Date(anno, mese, 0);
        break;

      case 'settimana-corrente':
        const giornoSettimana = oggi.getDay();
        inizio = new Date(oggi);
        inizio.setDate(oggi.getDate() - giornoSettimana);
        fine = new Date(inizio);
        fine.setDate(inizio.getDate() + 6);
        break;

      case 'settimana-precedente':
        const giornoSettimanaPre = oggi.getDay();
        fine = new Date(oggi);
        fine.setDate(oggi.getDate() - giornoSettimanaPre - 1);
        inizio = new Date(fine);
        inizio.setDate(fine.getDate() - 6);
        break;

      case 'ultimi-30-giorni':
        fine = new Date(oggi);
        inizio = new Date(oggi);
        inizio.setDate(oggi.getDate() - 30);
        break;

      case 'ultimi-12-mesi':
        fine = new Date(oggi);
        inizio = new Date(oggi);
        inizio.setFullYear(oggi.getFullYear() - 1);
        break;

      case 'trimestre-corrente':
        const trimestre = Math.floor(mese / 3);
        inizio = new Date(anno, trimestre * 3, 1);
        fine = new Date(anno, trimestre * 3 + 3, 0);
        break;

      case 'trimestre-precedente':
        const trimestrePre = Math.floor(mese / 3) - 1;
        if (trimestrePre < 0) {
          inizio = new Date(anno - 1, 9, 1);
          fine = new Date(anno - 1, 12, 0);
        } else {
          inizio = new Date(anno, trimestrePre * 3, 1);
          fine = new Date(anno, trimestrePre * 3 + 3, 0);
        }
        break;

      case 'anno-corrente':
        inizio = new Date(anno, 0, 1);
        fine = new Date(anno, 11, 31);
        break;

      case 'anno-precedente':
        inizio = new Date(anno - 1, 0, 1);
        fine = new Date(anno - 1, 11, 31);
        break;

      case 'mese-attuale-ad-oggi':
        inizio = new Date(anno, mese, 1);
        fine = new Date(oggi);
        break;

      case 'trimestre-attuale-ad-oggi':
        const trimAdOggi = Math.floor(mese / 3);
        inizio = new Date(anno, trimAdOggi * 3, 1);
        fine = new Date(oggi);
        break;

      case 'anno-attuale-ad-oggi':
        inizio = new Date(anno, 0, 1);
        fine = new Date(oggi);
        break;

      case 'personalizzato':
        return; // Non cambia le date

      default:
        return;
    }

    setFiltri({
      ...filtri,
      dataInizio: inizio.toISOString().split('T')[0],
      dataFine: fine.toISOString().split('T')[0]
    });
  };

  useEffect(() => {
    if (periodoSelezionato !== 'personalizzato') {
      applicaPeriodoPredefinito(periodoSelezionato);
    }
  }, [periodoSelezionato]); // ✅ Rimosso filtri dalle dipendenze

  // Genera report
  const generaReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const enteId = localStorage.getItem('ente_id');

      // ✅ DEBUG: Vedi cosa invii
      console.log('📅 DATE INVIATE:', {
        dataInizio: filtri.dataInizio,
        dataFine: filtri.dataFine,
        periodo: periodoSelezionato
      });

      const response = await axios.post(
        '/api/contabilita/report',
        {
          tipo: tipoReport,
          ...filtri,
          contiSelezionati,
          categorieSelezionate,
          ente_id: enteId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Ente-Id': enteId
          }
        }
      );

      setDatiReport(response.data);
      setMostraAnteprima(true);
    } catch (error) {
      console.error('Errore generazione report:', error);
      alert('Errore nella generazione del report');
    } finally {
      setLoading(false);
    }
  };

  // Stampa
  const stampaReport = () => {
    window.print();
  };

  // Export CSV
  const esportaCSV = () => {
    if (!datiReport || !datiReport.movimenti) return;

    const csv = [
      ['Data', 'Causale', 'Categoria', 'Tipo', 'Importo'],
      ...datiReport.movimenti.map(m => [
        m.data,
        m.causale,
        m.categoria,
        m.tipo,
        m.importo
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Se anteprima è aperta, mostra solo quella
  if (mostraAnteprima && datiReport) {
    return (
      <div className="h-full">
        {/* TOOLBAR TOP - Non si stampa */}
        <div className="bg-white border-b border-gray-300 px-6 py-3 flex items-center justify-between print:hidden">
          <button
            onClick={() => setMostraAnteprima(false)}
            className="text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Indietro
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">ANTEPRIMA</span>
            <div className="h-6 w-px bg-gray-300"></div>
            <button
              onClick={stampaReport}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              STAMPA
            </button>
            <button
              onClick={esportaCSV}
              className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ESPORTA CSV
            </button>
          </div>
        </div>

        {/* CONTENUTO STAMPABILE */}
        <div id="report-printable" className="max-w-7xl mx-auto p-8 bg-white">

          {/* INTESTAZIONE ENTE */}
          <div className="border-b-2 border-gray-800 pb-3 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
                  {datiReport.ente?.denominazione || 'PARROCCHIA SANTA MARIA DEL POPOLO'}
                </h1>
                <p className="text-xs text-gray-600 mt-1">
                  {datiReport.ente?.indirizzo || 'Via Roma, 123'} - {datiReport.ente?.cap || '95041'} {datiReport.ente?.comune || 'Caltagirone'} ({datiReport.ente?.provincia || 'CT'})
                </p>
                <p className="text-xs text-gray-600">
                  C.F. {datiReport.ente?.codice_fiscale || '12345678901'} • Tel. {datiReport.ente?.telefono || '0933-123456'}
                </p>
              </div>
              <div className="text-right">
                <div className="bg-gray-100 px-4 py-2 rounded border border-gray-300">
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">DETTAGLIO CONTO</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{datiReport.conto || 'TUTTI I CONTI'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* DESCRIZIONE REPORT */}
          <div className="bg-gray-50 border border-gray-300 rounded px-4 py-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-gray-700">
                  <strong>Periodo:</strong> {new Date(filtri.dataInizio).toLocaleDateString('it-IT')} - {new Date(filtri.dataFine).toLocaleDateString('it-IT')}
                </span>
                {contiSelezionati.length > 0 && (
                  <span className="text-gray-700">
                    <strong>Conti:</strong> {contiSelezionati.length} selezionati
                  </span>
                )}
                {categorieSelezionate.length > 0 && (
                  <span className="text-gray-700">
                    <strong>Categorie:</strong> {categorieSelezionate.length} selezionate
                  </span>
                )}
              </div>
              <span className="text-gray-500">
                Generato: {new Date().toLocaleDateString('it-IT')} {new Date().toLocaleTimeString('it-IT')}
              </span>
            </div>
          </div>

          {/* RIEPILOGO ULTRA-COMPATTO */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="border border-gray-300 rounded px-3 py-1 text-center">
              <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide">Entrate</p>
              <p className="text-sm font-bold text-green-700">+{datiReport.totale_entrate?.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</p>
            </div>
            <div className="border border-gray-300 rounded px-3 py-1 text-center">
              <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide">Uscite</p>
              <p className="text-sm font-bold text-red-700">-{datiReport.totale_uscite?.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</p>
            </div>
            <div className="border border-gray-300 rounded px-3 py-1 text-center">
              <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide">Movimenti</p>
              <p className="text-sm font-bold text-gray-800">{datiReport.numero_movimenti || 0}</p>
            </div>
            <div className="border border-gray-300 rounded px-3 py-1 text-center">
              <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide">Saldo</p>
              <p className={`text-sm font-bold ${(datiReport.totale_entrate - datiReport.totale_uscite) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {(datiReport.totale_entrate - datiReport.totale_uscite) >= 0 ? '+' : ''}
                {(datiReport.totale_entrate - datiReport.totale_uscite).toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
              </p>
            </div>
          </div>


          📊 REPORT

          {/* TABELLA MOVIMENTI - Stile Banca Compatto */}
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-3 py-2 text-left font-bold text-gray-700 uppercase text-[10px]">Data</th>
                <th className="px-3 py-2 text-left font-bold text-gray-700 uppercase text-[10px]">Conto</th>
                <th className="px-3 py-2 text-left font-bold text-gray-700 uppercase text-[10px]">Categoria</th>
                <th className="px-3 py-2 text-right font-bold text-gray-700 uppercase text-[10px]">Entrata</th>
                <th className="px-3 py-2 text-right font-bold text-gray-700 uppercase text-[10px]">Uscita</th>
                <th className="px-3 py-2 text-left font-bold text-gray-700 uppercase text-[10px]">Note</th>
              </tr>
            </thead>
            <tbody>
              {datiReport.movimenti && datiReport.movimenti.map((mov, idx) => (
                <tr key={idx} className={`border-b border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-1.5 text-gray-800 font-medium whitespace-nowrap">
                    {new Date(mov.data_movimento).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-1.5 text-gray-700 text-[11px]">{mov.conto || '-'}</td>
                  <td className="px-3 py-1.5 text-gray-600 text-[11px]">{mov.categoria}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-green-700">
                    {mov.tipo_movimento === 'entrata' ? `+${parseFloat(mov.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-red-700">
                    {mov.tipo_movimento === 'uscita' ? `-${parseFloat(mov.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600 text-[11px] truncate max-w-xs">{mov.causale || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td colSpan="3" className="px-3 py-2 text-right uppercase text-gray-700 text-xs">TOTALI</td>
                <td className="px-3 py-2 text-right text-green-700 text-sm">
                  +{datiReport.totale_entrate?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right text-red-700 text-sm">
                  -{datiReport.totale_uscite?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
              <tr className="bg-gray-200 font-bold">
                <td colSpan="3" className="px-3 py-2 text-right uppercase text-gray-800 text-xs">SALDO</td>
                <td colSpan="3" className={`px-3 py-2 text-right text-sm ${(datiReport.totale_entrate - datiReport.totale_uscite) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {(datiReport.totale_entrate - datiReport.totale_uscite) >= 0 ? '+' : ''}
                  {(datiReport.totale_entrate - datiReport.totale_uscite).toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                </td>
              </tr>
            </tfoot>
          </table>

        </div>
      </div>
    );
  }

  // PAGINA FILTRI (default)
  return (
    <div className="bg-white rounded-lg shadow-sm h-full">

      {/* HEADER COMPATTO */}
      <div className="border-b border-gray-200 px-5 py-3">
        <h2 className="text-lg font-bold text-gray-800">Report Contabili</h2>
        <p className="text-xs text-gray-600">Genera report personalizzati con filtri avanzati</p>
      </div>

      <div className="p-5">

        {/* LAYOUT COMPATTO */}
        <div className="space-y-3">

          {/* RIGA 1: TIPO REPORT */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Tipo Report</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'dettaglio-conto', label: 'Dettaglio Conto', icon: '💰' },
                { value: 'movimenti-categoria', label: 'Mov. Categoria', icon: '📊' },
                { value: 'registro-cronologico', label: 'Reg. Cronologico', icon: '📅' },
                { value: 'libro-giornale', label: 'Libro Giornale', icon: '📖' }
              ].map(tipo => (
                <label
                  key={tipo.value}
                  className={`flex items-center justify-center p-2 border-2 rounded cursor-pointer transition-all ${tipoReport === tipo.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="tipo-report"
                    value={tipo.value}
                    checked={tipoReport === tipo.value}
                    onChange={(e) => setTipoReport(e.target.value)}
                    className="hidden"
                  />
                  <span className="text-xs font-semibold text-gray-800">{tipo.icon} {tipo.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* RIGA 2: PERIODO CON DROPDOWN */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Periodo</h3>
            <div className="grid grid-cols-12 gap-2 items-end">
              {/* Dropdown periodo predefinito */}
              <div className="col-span-4">
                <select
                  value={periodoSelezionato}
                  onChange={(e) => setPeriodoSelezionato(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {periodi.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Date inputs */}
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">Da</label>
                <input
                  type="date"
                  value={filtri.dataInizio}
                  onChange={(e) => {
                    setFiltri({ ...filtri, dataInizio: e.target.value });
                    setPeriodoSelezionato('personalizzato');
                  }}
                  disabled={periodoSelezionato !== 'personalizzato'}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1">A</label>
                <input
                  type="date"
                  value={filtri.dataFine}
                  onChange={(e) => {
                    setFiltri({ ...filtri, dataFine: e.target.value });
                    setPeriodoSelezionato('personalizzato');
                  }}
                  disabled={periodoSelezionato !== 'personalizzato'}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* RIGA 3: FILTRI CON MODAL */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Filtri</h3>
            <div className="grid grid-cols-4 gap-2">

              {/* Conti - Modal */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Conto</label>
                <button
                  onClick={() => setMostraModalConti(true)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-left bg-white hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="truncate">
                    {contiSelezionati.length === 0
                      ? 'Tutti i conti'
                      : contiSelezionati.length === 1
                        ? conti.find(c => c.id === contiSelezionati[0])?.nome
                        : `${contiSelezionati.length} selezionati`}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Categorie - Modal */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                <button
                  onClick={() => setMostraModalCategorie(true)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-left bg-white hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="truncate">
                    {categorieSelezionate.length === 0
                      ? 'Tutte'
                      : `${categorieSelezionate.length} selezionate`}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Tipo Movimento */}
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Tipo Movimento</label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center px-2 py-1.5 bg-white border border-gray-300 rounded cursor-pointer hover:border-green-500 text-xs">
                    <input
                      type="checkbox"
                      checked={filtri.tipiMovimento.entrate}
                      onChange={(e) => setFiltri({
                        ...filtri,
                        tipiMovimento: { ...filtri.tipiMovimento, entrate: e.target.checked }
                      })}
                      className="mr-1.5"
                    />
                    <span className="font-medium">Entrate</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center px-2 py-1.5 bg-white border border-gray-300 rounded cursor-pointer hover:border-red-500 text-xs">
                    <input
                      type="checkbox"
                      checked={filtri.tipiMovimento.uscite}
                      onChange={(e) => setFiltri({
                        ...filtri,
                        tipiMovimento: { ...filtri.tipiMovimento, uscite: e.target.checked }
                      })}
                      className="mr-1.5"
                    />
                    <span className="font-medium">Uscite</span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* RIGA 4: AZIONI */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <button
              onClick={generaReport}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? '⏳ Generazione...' : '🚀 GENERA REPORT'}
            </button>
            <button
              onClick={() => {
                setFiltri({
                  dataInizio: new Date().getFullYear() + '-01-01',
                  dataFine: new Date().getFullYear() + '-12-31',
                  contoId: '',
                  categoriaId: '',
                  sottocategoriaId: '',
                  microcategoriaId: '',
                  tipiMovimento: { entrate: true, uscite: true }
                });
                setPeriodoSelezionato('anno-corrente');
                setContiSelezionati([]);
                setCategorieSelezionate([]);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded hover:bg-gray-200"
            >
              🔄 Azzera
            </button>
          </div>

        </div>
      </div>

      {/* MODAL CONTI */}
      {mostraModalConti && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setMostraModalConti(false)}>
          <div className="bg-white rounded-lg shadow-xl w-96 max-h-96" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">Selezione Conti</h3>
              <button onClick={() => setMostraModalConti(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              <div className="space-y-1">
                {conti.map(conto => (
                  <label key={conto.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={contiSelezionati.includes(conto.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setContiSelezionati([...contiSelezionati, conto.id]);
                        } else {
                          setContiSelezionati(contiSelezionati.filter(id => id !== conto.id));
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{conto.nome}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
              <button
                onClick={() => setContiSelezionati([])}
                className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200"
              >
                Deseleziona tutto
              </button>
              <button
                onClick={() => setMostraModalConti(false)}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATEGORIE */}
      {mostraModalCategorie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setMostraModalCategorie(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[500px]" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm">Selezione Categorie</h3>
              <span className="text-xs text-gray-500">({categorie.length} totali)</span>
              <button onClick={() => setMostraModalCategorie(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto">
              <CategorieTree
                categorie={buildCategorieTree(categorie)}
                selezionate={categorieSelezionate}
                onToggle={(id) => {
                  if (categorieSelezionate.includes(id)) {
                    setCategorieSelezionate(categorieSelezionate.filter(cid => cid !== id));
                  } else {
                    setCategorieSelezionate([...categorieSelezionate, id]);
                  }
                }}
              />
            </div>
            <div className="border-t border-gray-200 px-4 py-3 flex justify-between gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const tutteIds = categorie.map(c => c.id);
                    setCategorieSelezionate(tutteIds);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200"
                >
                  Seleziona tutto
                </button>
                <button
                  onClick={() => setCategorieSelezionate([])}
                  className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200"
                >
                  Deseleziona tutto
                </button>
              </div>
              <button
                onClick={() => setMostraModalCategorie(false)}
                className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Rapporti;