import React, { createContext, useContext, useState, useCallback } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve essere usato dentro DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [refreshCounters, setRefreshCounters] = useState({
    utenti: 0,
    enti: 0,
    categorie: 0,
    movimenti: 0,
    registri: 0
  });

  const refreshUtenti = useCallback(() => {
    setRefreshCounters(prev => ({ ...prev, utenti: prev.utenti + 1 }));
  }, []);

  const refreshEnti = useCallback(() => {
    setRefreshCounters(prev => ({ ...prev, enti: prev.enti + 1 }));
  }, []);

  const refreshCategorie = useCallback(() => {
    setRefreshCounters(prev => ({ ...prev, categorie: prev.categorie + 1 }));
  }, []);

  const refreshMovimenti = useCallback(() => {
    setRefreshCounters(prev => ({ ...prev, movimenti: prev.movimenti + 1 }));
  }, []);

  const refreshRegistri = useCallback(() => {
    setRefreshCounters(prev => ({ ...prev, registri: prev.registri + 1 }));
  }, []);

  const refreshAll = useCallback(() => {
    setRefreshCounters(prev => ({
      utenti: prev.utenti + 1,
      enti: prev.enti + 1,
      categorie: prev.categorie + 1,
      movimenti: prev.movimenti + 1,
      registri: prev.registri + 1
    }));
  }, []);

  const value = {
    refreshCounters,
    refreshUtenti,
    refreshEnti,
    refreshCategorie,
    refreshMovimenti,
    refreshRegistri,
    refreshAll
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};