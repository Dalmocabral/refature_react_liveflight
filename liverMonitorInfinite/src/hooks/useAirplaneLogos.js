import { useQuery } from '@tanstack/react-query';
import ApiService from '../components/ApiService';

export const useAirplaneLogos = () => {
  return useQuery({
    queryKey: ['airplaneLogos'],
    queryFn: async () => {
      const data = await ApiService.getAirplaneLogoData();
      return data || [];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
  });
};
