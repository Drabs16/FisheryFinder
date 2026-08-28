import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useReservations, PaymentMethod } from '../context/ReservationsContext';
import { supabase } from '../lib/supabase';
import BookingConfirmSheet from './BookingConfirmSheet';
import BookingSuccessSheet from './BookingSuccessSheet';

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseIso = (iso: string) => new Date(`${iso}T12:00:00`);
const isoLocal = (date: Date) => isoOf(date.getFullYear(), date.getMonth(), date.getDate());

const enumerateDays = (a: string, b: string): string[] => {
  const res: string[] = [];
  const d = parseIso(a);
  const end = parseIso(b);
  while (d <= end) { res.push(isoLocal(d)); d.setDate(d.getDate() + 1); }
  return res;
};

const fmtShort = (iso: string) => {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

interface Props {
  totalSpots: number;
  fisheryId: string;
  fisheryName: string;
  priceFrom: number;
  initialFrom?: string | null;
  initialTo?: string | null;
  userName?: string;
  userPhone?: string;
  spotMap?: any;
  onClose: () => void;
  onViewReservations?: () => void;
}

export default function SpotCalendar({
  totalSpots, fisheryId, fisheryName, priceFrom, initialFrom, initialTo,
  userName, userPhone, spotMap, onClose, onViewReservations,
}: Props) {
  const { addReservation } = useReservations();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  // Realna zajętość z bazy: mapa dzień (ISO) -> zajęte numery stanowisk.
  const [taken, setTaken] = useState<Record<string, number[]>>({});
  const isTaken = (spot: number, iso: string) => (taken[iso]?.includes(spot)) ?? false;
  const today = new Date();
  const todayIso = isoLocal(today);
  const init = initialFrom ? parseIso(initialFrom) : today;

  const [month, setMonth] = useState(init.getMonth());
  const [year, setYear] = useState(init.getFullYear());
  const [from, setFrom] = useState<string | null>(initialFrom ?? null);
  const [to, setTo] = useState<string | null>(
    initialTo && initialTo !== initialFrom ? initialTo : null,
  );
  const [selectedSpots, setSelectedSpots] = useState<number[]>([]);
  const [focusSpot, setFocusSpot] = useState<number | null>(null);

  const spots = useMemo(() => Array.from({ length: totalSpots }, (_, i) => i + 1), [totalSpots]);

  // Pobiera realną zajętość łowiska (okno: od dziś przez ~13 miesięcy).
  const loadOccupancy = useCallback(async () => {
    const from = todayIso;
    const end = new Date(today);
    end.setDate(end.getDate() + 400);
    const to = isoLocal(end);
    const { data, error } = await supabase.rpc('fishery_occupancy', {
      p_fishery: fisheryId, p_from: from, p_to: to,
    });
    if (error || !data) return;
    const map: Record<string, number[]> = {};
    for (const row of data as { d: string; spot: number }[]) {
      (map[row.d] ??= []).push(row.spot);
    }
    setTaken(map);
  }, [fisheryId, todayIso]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadOccupancy(); }, [loadOccupancy]);

  // Dni w wybranym terminie (jeden dzień, jeśli brak daty wyjazdu)
  const rangeDays = useMemo(() => {
    if (!from) return [];
    if (!to) return [from];
    return enumerateDays(from, to);
  }, [from, to]);

  const spotAvailable = (spot: number) =>
    rangeDays.length > 0 && rangeDays.every((iso) => !isTaken(spot, iso));

  // Gdy zmienia się termin lub zajętość — usuń z wyboru stanowiska, które przestały być wolne
  useEffect(() => {
    setSelectedSpots((prev) => prev.filter((s) => rangeDays.length > 0 && rangeDays.every((iso) => !isTaken(s, iso))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, taken]);

  // --- Kalendarz ---
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Pn = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const canGoPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  const prevMonth = () => {
    if (!canGoPrev) return;
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const handleDay = (day: number) => {
    const key = isoOf(year, month, day);
    if (key < todayIso) return;
    if (!from || (from && to)) {
      setFrom(key); setTo(null);
    } else if (key < from) {
      setTo(from); setFrom(key);
    } else if (key === from) {
      setTo(null);
    } else {
      setTo(key);
    }
  };

  const dayState = (day: number) => {
    const key = isoOf(year, month, day);
    const past = key < todayIso;
    const isFrom = key === from;
    const isTo = key === to;
    const inRange = !!from && !!to && key > from && key < to;
    let freeCount = 0;
    if (!past) {
      if (focusSpot !== null) freeCount = isTaken(focusSpot, key) ? 0 : 1;
      else freeCount = spots.filter((s) => !isTaken(s, key)).length;
    }
    return { key, past, isFrom, isTo, inRange, freeCount };
  };

  const dotColor = (freeCount: number) => {
    if (focusSpot !== null) return freeCount > 0 ? colors.success : colors.error;
    if (freeCount === 0) return colors.error;
    if (freeCount <= Math.max(2, Math.round(totalSpots * 0.2))) return '#F59E0B';
    return colors.success;
  };

  // --- Stanowiska ---
  const onSpotPress = (spot: number) => {
    setFocusSpot((f) => (f === spot ? null : spot));
    if (spotAvailable(spot)) {
      setSelectedSpots((prev) =>
        prev.includes(spot) ? prev.filter((s) => s !== spot) : [...prev, spot],
      );
    }
  };

  const numDays = rangeDays.length;
  const total = selectedSpots.length * priceFrom * Math.max(1, numDays);

  const rangeLabel = from
    ? to && to !== from
      ? `${fmtShort(from)} – ${fmtShort(to)} · ${numDays} dni`
      : `${fmtShort(from)} · 1 dzień`
    : 'Wybierz termin w kalendarzu';

  const clearDates = () => { setFrom(null); setTo(null); };

  const openConfirm = () => {
    if (!from || selectedSpots.length === 0) return;
    setConfirmVisible(true);
  };

  const confirmBooking = async (payment: PaymentMethod, totalPaid: number) => {
    const sortedSpots = [...selectedSpots].sort((a, b) => a - b);
    await addReservation({
      fisheryId,
      fishery: fisheryName,
      spots: sortedSpots,
      dateFrom: from!,
      dateTo: to ?? from!,
      days: Math.max(1, numDays),
      dateLabel: rangeLabel,
      pricePerDay: priceFrom,
      total: totalPaid,
      payment,
      name: userName ?? '',
      phone: userPhone ?? '',
    });
    setConfirmVisible(false);
    setSuccessVisible(true);
    setSelectedSpots([]);
    loadOccupancy(); // odśwież kalendarz po rezerwacji
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.fisheryName} numberOfLines={1}>{fisheryName}</Text>
          <Text style={styles.subtitle}>{totalSpots} stanowisk · wybierz termin i stanowiska</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Nawigacja miesięcy */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={prevMonth}
            style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
            disabled={!canGoPrev}
          >
            <Ionicons name="chevron-back" size={20} color={canGoPrev ? colors.primary : colors.border} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Podgląd dostępności */}
        <Text style={styles.previewHint}>
          {focusSpot !== null
            ? `Kalendarz pokazuje wolne dni stanowiska #${focusSpot}`
            : 'Kalendarz pokazuje ile stanowisk jest wolnych danego dnia'}
        </Text>

        {/* Nagłówki dni tygodnia */}
        <View style={styles.weekHeader}>
          {WEEKDAYS.map((d) => <Text key={d} style={styles.weekHeaderText}>{d}</Text>)}
        </View>

        {/* Siatka kalendarza */}
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={styles.dayCell} />;
              const st = dayState(day);
              const selectedEdge = st.isFrom || st.isTo;
              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.dayCell,
                    st.inRange && styles.dayInRange,
                    selectedEdge && styles.dayEdge,
                  ]}
                  disabled={st.past}
                  onPress={() => handleDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayText,
                    st.past && styles.dayTextPast,
                    st.inRange && styles.dayTextRange,
                    selectedEdge && styles.dayTextEdge,
                  ]}>
                    {day}
                  </Text>
                  {!st.past && !selectedEdge && (
                    <View style={[styles.dayDot, { backgroundColor: dotColor(st.freeCount) }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Legenda kalendarza */}
        <View style={styles.legend}>
          <LegendItem color={colors.success} label={focusSpot !== null ? 'Wolne' : 'Dużo miejsc'} />
          {focusSpot === null && <LegendItem color="#F59E0B" label="Mało miejsc" />}
          <LegendItem color={colors.error} label={focusSpot !== null ? 'Zajęte' : 'Brak miejsc'} />
        </View>

        {/* Wybrany termin */}
        <View style={styles.rangeBar}>
          <View style={styles.rangeLeft}>
            <Ionicons name="calendar" size={16} color={colors.accent} />
            <Text style={[styles.rangeText, !from && styles.rangeTextEmpty]}>{rangeLabel}</Text>
          </View>
          {from && (
            <TouchableOpacity onPress={clearDates}>
              <Text style={styles.rangeClear}>Wyczyść</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stanowiska */}
        <View style={styles.spotsHead}>
          <Text style={styles.sectionLabel}>Stanowiska</Text>
          {focusSpot !== null && (
            <TouchableOpacity onPress={() => setFocusSpot(null)} style={styles.resetFocus}>
              <Ionicons name="eye-off-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.resetFocusText}>Pokaż wszystkie na kalendarzu</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.spotsHint}>
          {from
            ? 'Dotknij stanowisko, aby je wybrać. Możesz wybrać kilka naraz.'
            : 'Wybierz termin powyżej, aby zobaczyć wolne stanowiska. Dotknij numeru, aby podejrzeć jego wolne dni.'}
        </Text>

        <View style={styles.spotsGrid}>
          {spots.map((spot) => {
            const available = spotAvailable(spot);
            const selected = selectedSpots.includes(spot);
            const focused = focusSpot === spot;
            const disabled = from != null && !available;
            return (
              <TouchableOpacity
                key={spot}
                style={[
                  styles.spotCell,
                  disabled && styles.spotCellTaken,
                  selected && styles.spotCellSelected,
                  focused && !selected && styles.spotCellFocused,
                ]}
                onPress={() => onSpotPress(spot)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.spotCellText,
                  disabled && styles.spotCellTextTaken,
                  selected && styles.spotCellTextSelected,
                ]}>
                  {spot}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.spotLegend}>
          <LegendItem color={colors.accent + '30'} label="Wolne" border={colors.accent} />
          <LegendItem color={colors.primary} label="Wybrane" />
          <LegendItem color={colors.border} label="Zajęte" />
        </View>

        {/* Mapa stanowisk */}
        <View style={styles.spotMapSection}>
          <Text style={styles.sectionLabel}>Mapa stanowisk</Text>
          {spotMap ? (
            <Image source={typeof spotMap === 'string' ? { uri: spotMap } : spotMap} style={styles.spotMapImg} resizeMode="contain" />
          ) : (
            <View style={styles.noMap}>
              <Ionicons name="map-outline" size={26} color={colors.textSecondary} />
              <Text style={styles.noMapText}>Mapa stanowisk niedostępna dla tego łowiska</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {selectedSpots.length > 0 ? (
          <View style={styles.bottomContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bottomSummary} numberOfLines={1}>
                {selectedSpots.length} {selectedSpots.length === 1 ? 'stanowisko' : 'stanowiska'} · {rangeLabel}
              </Text>
              <Text style={styles.bottomPrice}>{total} zł</Text>
            </View>
            <TouchableOpacity style={styles.bookBtn} onPress={openConfirm}>
              <Text style={styles.bookBtnText}>Zarezerwuj</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.bottomEmpty}>
            {from ? 'Wybierz przynajmniej jedno stanowisko' : 'Wybierz termin i stanowisko'}
          </Text>
        )}
      </View>

      <BookingConfirmSheet
        visible={confirmVisible}
        fishery={fisheryName}
        spots={selectedSpots}
        dateLabel={rangeLabel}
        days={Math.max(1, numDays)}
        pricePerDay={priceFrom}
        name={userName ?? ''}
        phone={userPhone ?? ''}
        onClose={() => setConfirmVisible(false)}
        onConfirm={confirmBooking}
      />

      <BookingSuccessSheet
        visible={successVisible}
        phone={userPhone ?? ''}
        onViewReservations={() => { setSuccessVisible(false); onViewReservations?.(); }}
        onClose={() => { setSuccessVisible(false); onClose(); }}
      />
    </View>
  );
}

function LegendItem({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderWidth: border ? 1.5 : 0, borderColor: border }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerCenter: { flex: 1 },
  fisheryName: { fontSize: 16, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  scroll: { paddingBottom: 24 },
  monthNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
  },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { opacity: 0.4 },
  monthLabel: { fontSize: 17, fontWeight: '800', color: colors.text },
  previewHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 10, paddingHorizontal: 20 },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  weekRow: { flexDirection: 'row', paddingHorizontal: 12 },
  dayCell: {
    flex: 1, height: 46, alignItems: 'center', justifyContent: 'center',
    paddingTop: 4,
  },
  dayInRange: { backgroundColor: colors.accent + '22' },
  dayEdge: { backgroundColor: colors.primary, borderRadius: 12 },
  dayText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  dayTextPast: { color: colors.border },
  dayTextRange: { color: colors.primary, fontWeight: '700' },
  dayTextEdge: { color: colors.accent, fontWeight: '900' },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 10, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  rangeBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  rangeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  rangeText: { fontSize: 14, color: colors.text, fontWeight: '700' },
  rangeTextEmpty: { color: colors.textSecondary, fontWeight: '500' },
  rangeClear: { fontSize: 13, color: colors.error, fontWeight: '600' },
  spotsHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 18,
  },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  resetFocus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetFocusText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  spotsHint: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: 16, marginTop: 6, marginBottom: 12, lineHeight: 17 },
  spotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  spotCell: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: colors.accent + '20', borderWidth: 2, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  spotCellTaken: { backgroundColor: colors.border, borderColor: colors.border },
  spotCellSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  spotCellFocused: { borderColor: colors.water, borderWidth: 2.5 },
  spotCellText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  spotCellTextTaken: { color: colors.textSecondary },
  spotCellTextSelected: { color: colors.accent },
  spotLegend: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, marginTop: 14 },
  spotMapSection: { paddingHorizontal: 16, marginTop: 24 },
  spotMapImg: { width: '100%', height: 220, borderRadius: 14, marginTop: 10, backgroundColor: colors.background },
  noMap: {
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10,
    backgroundColor: colors.background, borderRadius: 14, paddingVertical: 28, paddingHorizontal: 20,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  noMapText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  bottomBar: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 32,
    backgroundColor: '#fff',
  },
  bottomContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bottomSummary: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  bottomPrice: { fontSize: 22, fontWeight: '900', color: colors.primary, marginTop: 2 },
  bottomEmpty: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  bookBtn: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14,
  },
  bookBtnText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
});
