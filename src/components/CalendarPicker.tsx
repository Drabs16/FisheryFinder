import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (from: string, to: string) => void;
}

export default function CalendarPicker({ visible, onClose, onSelect }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  // Lokalna data YYYY-MM-DD (toISOString przesuwałby dzień w strefach +UTC, np. PL → rezerwacja o dzień obok)
  const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Generuj dni w miesiacu
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Pn=0
  const daysInMonth = lastDay.getDate();

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDay = (day: number) => {
    const key = toKey(new Date(year, month, day));
    const todayKey = toKey(today);
    if (key < todayKey) return;

    if (!from || (from && to)) {
      setFrom(key); setTo(null);
    } else {
      if (key < from) { setTo(from); setFrom(key); }
      else if (key === from) { setTo(null); }
      else setTo(key);
    }
  };

  const isToday = (day: number) => toKey(new Date(year, month, day)) === toKey(today);
  const isFrom = (day: number) => toKey(new Date(year, month, day)) === from;
  const isTo = (day: number) => toKey(new Date(year, month, day)) === to;
  const isInRange = (day: number) => {
    if (!from || !to) return false;
    const k = toKey(new Date(year, month, day));
    return k > from && k < to;
  };
  const isPast = (day: number) => toKey(new Date(year, month, day)) < toKey(today);

  const handleConfirm = () => {
    if (from) {
      onSelect(from, to ?? from);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Wybierz termin</Text>
          <TouchableOpacity onPress={() => { setFrom(null); setTo(null); }}>
            <Text style={styles.clearBtn}>Wyczyść</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          {!from ? 'Wybierz datę przyjazdu' : !to ? 'Wybierz datę wyjazdu' : `${from} – ${to}`}
        </Text>

        {/* Nawigacja miesięcy */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Nagłówki dni */}
        <View style={styles.daysHeader}>
          {DAYS.map((d) => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Kalendarz */}
        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={styles.cell} />;
            const past = isPast(day);
            const inRange = isInRange(day);
            const isStart = isFrom(day);
            const isEnd = isTo(day);
            const todayDay = isToday(day);

            const edge = isStart || isEnd;
            return (
              <TouchableOpacity
                key={`d${day}`}
                style={[styles.cell, inRange && styles.cellRange, edge && styles.cellEdge]}
                onPress={() => !past && handleDay(day)}
                disabled={past}
                activeOpacity={0.7}
              >
                <View style={[styles.dayInner, todayDay && !edge && styles.dayToday]}>
                  <Text style={[
                    styles.cellText,
                    past && styles.cellTextPast,
                    inRange && styles.cellTextRange,
                    edge && styles.cellTextEdge,
                    todayDay && !edge && styles.cellTextToday,
                  ]}>
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        {/* Confirm */}
        <TouchableOpacity
          style={[styles.confirmBtn, !from && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!from}
        >
          <Text style={styles.confirmText}>
            {from && to && from !== to
              ? `Potwierdź — ${Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1} dni`
              : from ? 'Potwierdź — 1 dzień' : 'Wybierz datę'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  clearBtn: { fontSize: 14, color: colors.accent, fontWeight: '600' },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 17, fontWeight: '800', color: colors.text },
  daysHeader: { flexDirection: 'row', marginBottom: 6 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' },
  cellRange: { backgroundColor: colors.accent + '22' },
  cellEdge: { backgroundColor: colors.primary, borderRadius: 12 },
  dayInner: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayToday: { borderWidth: 2, borderColor: colors.accent },
  cellText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  cellTextPast: { color: colors.border },
  cellTextRange: { color: colors.primary, fontWeight: '700' },
  cellTextEdge: { color: colors.accent, fontWeight: '900' },
  cellTextToday: { color: colors.primary, fontWeight: '800' },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 8 },
  confirmBtnDisabled: { backgroundColor: colors.border },
  confirmText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
