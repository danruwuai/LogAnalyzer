import { useState, useEffect } from 'react';

const useLogFile = () => {
  const [logData, setLogData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadFile = async (filePath) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.api.readFull(filePath);
      if (result.success) {
        setLogData(result.lines);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { logData, loading, error, loadFile };
};

export default useLogFile;
