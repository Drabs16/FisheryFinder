import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingScreen from './src/screens/LoadingScreen';
import ConfirmationBanner from './src/components/ConfirmationBanner';
import { AuthProvider } from './src/context/AuthContext';
import { ReservationsProvider } from './src/context/ReservationsContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { FisheriesProvider } from './src/context/FisheriesContext';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <AuthProvider>
      <ReservationsProvider>
        <FavoritesProvider>
          <FisheriesProvider>
            <StatusBar style="light" />
            {isLoading ? (
              <LoadingScreen onFinish={() => setIsLoading(false)} />
            ) : (
              <>
                <AppNavigator />
                <ConfirmationBanner />
              </>
            )}
          </FisheriesProvider>
        </FavoritesProvider>
      </ReservationsProvider>
    </AuthProvider>
  );
}
