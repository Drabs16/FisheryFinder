import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import {
  useReservations, Reservation, PAYMENT_LABELS,
} from '../context/ReservationsContext';

const MS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const MONTHS_NOM = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

const pad = (n: number) => String(n).padStart(2, '0');
const parseIso = (s: string) => new Date(`${s}T12:00:00`);

const fmtRange = (r: Reservation) => {
  const a = parseIso(r.dateFrom);
  const b = parseIso(r.dateTo);
  if (r.dateFrom === r.dateTo) return `${a.getDate()} ${MS[a.getMonth()]} ${a.getFullYear()}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MS[a.getMonth()]} ${a.getFullYear()}`;
  return `${a.getDate()} ${MS[a.getMonth()]} – ${b.getDate()} ${MS[b.getMonth()]} ${b.getFullYear()}`;
};

const spotsText = (spots: number[]) => spots.join(', ');

const daysUntil = (iso: string) => {
  const d = parseIso(iso);
  const now = new Date(); now.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
};

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const addToPhoneCalendar = (r: Reservation) => {
  const start = r.dateFrom.replace(/-/g, '');
  const endDate = parseIso(r.dateTo);
  endDate.setDate(endDate.getDate() + 1); // Google Calendar: koniec wyłączny
  const end = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`;
  const text = encodeURIComponent(`Wędkowanie — ${r.fishery}`);
  const details = encodeURIComponent(
    `${r.spots.length > 1 ? 'Stanowiska' : 'Stanowisko'}: ${spotsText(r.spots)} · ${r.days} ${r.days === 1 ? 'dzień' : 'dni'} · Fishery Finder`,
  );
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
  Linking.openURL(url);
};

export default function ReservationsScreen() {
  const { reservations, cancelReservation, rateReservation, shareReservation, unreadCount } = useReservations();
  const navigation = useNavigation<any>();

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Reservation | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [shareTarget, setShareTarget] = useState<Reservation | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareDoneMsg, setShareDoneMsg] = useState<string | null>(null);

  const upcoming = reservations
    .filter((r) => r.status === 'upcoming')
    .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
  const past = reservations
    .filter((r) => r.status !== 'upcoming')
    .sort((a, b) => b.createdAt - a.createdAt);

  const doCancel = () => {
    if (!cancelTarget) return;
    cancelReservation(cancelTarget.id);
    setCancelMsg(
      `Anulowano rezerwację: ${cancelTarget.fishery}, ${fmtRange(cancelTarget)}. ` +
      `Zwrot środków do 3 dni roboczych. Do zobaczenia następnym razem!`,
    );
    setCancelTarget(null);
  };

  const openReview = (r: Reservation) => { setReviewTarget(r); setReviewStars(r.rating ?? 0); };
  const saveReview = () => {
    if (reviewTarget && reviewStars > 0) rateReservation(reviewTarget.id, reviewStars);
    setReviewTarget(null);
  };

  const openShare = (r: Reservation) => { setShareTarget(r); setShareEmail(''); };
  const doShare = () => {
    if (!shareTarget || !isValidEmail(shareEmail)) return;
    const email = shareEmail.trim().toLowerCase();
    shareReservation(shareTarget.id, email);
    setShareDoneMsg(
      `Zaproszenie wysłane do ${email}. Rezerwacja „${shareTarget.fishery}" (${fmtRange(shareTarget)}) ` +
      `pojawi się w jego kalendarzu w Fishery Finder.`,
    );
    setShareTarget(null);
    setShareEmail('');
  };

  const empty = reservations.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Moje rezerwacje</Text>
          <Text style={styles.headerSub}>{upcoming.length} nadchodzące · {past.length} w historii</Text>
        </View>
        <TouchableOpacity
          style={styles.bell}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityLabel="Powiadomienia"
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {!empty && (
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, view === 'list' && styles.segmentActive]}
            onPress={() => setView('list')}
          >
            <Ionicons name="list" size={16} color={view === 'list' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.segmentText, view === 'list' && styles.segmentTextActive]}>Lista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, view === 'calendar' && styles.segmentActive]}
            onPress={() => setView('calendar')}
          >
            <Ionicons name="calendar" size={16} color={view === 'calendar' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.segmentText, view === 'calendar' && styles.segmentTextActive]}>Kalendarz</Text>
          </TouchableOpacity>
        </View>
      )}

      {empty ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="calendar-outline" size={64} color={colors.border} />
          <Text style={styles.emptyText}>Brak rezerwacji</Text>
          <Text style={styles.emptySub}>Zarezerwuj stanowisko na ulubionym łowisku</Text>
        </View>
      ) : view === 'list' ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {upcoming.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Nadchodzące</Text>
              {upcoming.map((r) => (
                <ReservationCard key={r.id} r={r} onCancel={() => setCancelTarget(r)} onReview={() => openReview(r)} onShare={() => openShare(r)} />
              ))}
            </>
          )}
          {past.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Historia</Text>
              {past.map((r) => (
                <ReservationCard key={r.id} r={r} onCancel={() => setCancelTarget(r)} onReview={() => openReview(r)} onShare={() => openShare(r)} />
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <ReservationsCalendar reservations={reservations} onShare={openShare} />
      )}

      {/* Anulowanie — customowe okno */}
      {cancelTarget && (
        <View style={styles.overlay}>
          <View style={styles.backdrop} />
          <View style={styles.dialog}>
            <View style={styles.warnIcon}>
              <Ionicons name="alert" size={30} color={colors.error} />
            </View>
            <Text style={styles.dialogTitle}>Anulować rezerwację?</Text>
            <Text style={styles.dialogText}>
              {cancelTarget.fishery} · {fmtRange(cancelTarget)}{'\n'}
              {cancelTarget.spots.length > 1 ? 'Stanowiska' : 'Stanowisko'} {spotsText(cancelTarget.spots)}
            </Text>
            <Text style={styles.dialogNote}>Wyślemy SMS z potwierdzeniem anulowania.</Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={doCancel} activeOpacity={0.9}>
              <Text style={styles.dangerBtnText}>Tak, anuluj rezerwację</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setCancelTarget(null)}>
              <Text style={styles.ghostBtnText}>Wróć</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Potwierdzenie anulowania — SMS */}
      {cancelMsg && (
        <View style={styles.overlay}>
          <View style={styles.backdrop} />
          <View style={styles.dialog}>
            <View style={styles.smsIcon}>
              <Ionicons name="checkmark" size={28} color="#fff" />
            </View>
            <Text style={styles.dialogTitle}>Rezerwacja anulowana</Text>
            <Text style={styles.dialogText}>{cancelMsg}</Text>
            <Text style={styles.dialogNote}>Potwierdzenie wysłaliśmy SMS-em na Twój numer.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setCancelMsg(null)}>
              <Text style={styles.primaryBtnText}>Gotowe</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ocena */}
      {reviewTarget && (
        <View style={styles.overlay}>
          <View style={styles.backdrop} />
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Oceń łowisko</Text>
            <Text style={styles.dialogText}>{reviewTarget.fishery}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setReviewStars(s)} activeOpacity={0.7}>
                  <Ionicons
                    name={s <= reviewStars ? 'star' : 'star-outline'}
                    size={38}
                    color={s <= reviewStars ? '#F59E0B' : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, reviewStars === 0 && styles.primaryBtnDisabled]}
              onPress={saveReview}
              disabled={reviewStars === 0}
            >
              <Text style={styles.primaryBtnText}>{reviewTarget.rating ? 'Zapisz zmianę' : 'Dodaj opinię'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setReviewTarget(null)}>
              <Text style={styles.ghostBtnText}>Anuluj</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Udostępnij innemu użytkownikowi Fishery Finder */}
      {shareTarget && (
        <View style={styles.overlay}>
          <View style={styles.backdrop} />
          <View style={styles.dialog}>
            <View style={styles.shareIcon}>
              <Ionicons name="people" size={28} color={colors.accent} />
            </View>
            <Text style={styles.dialogTitle}>Udostępnij rezerwację</Text>
            <Text style={styles.dialogText}>
              Podaj e-mail konta Fishery Finder znajomego. Rezerwacja pojawi się w jego kalendarzu w aplikacji.
            </Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="np. kolega@email.com"
                placeholderTextColor={colors.textSecondary}
                value={shareEmail}
                onChangeText={setShareEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, !isValidEmail(shareEmail) && styles.primaryBtnDisabled]}
              onPress={doShare}
              disabled={!isValidEmail(shareEmail)}
            >
              <Text style={styles.primaryBtnText}>Wyślij zaproszenie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setShareTarget(null)}>
              <Text style={styles.ghostBtnText}>Anuluj</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Potwierdzenie udostępnienia */}
      {shareDoneMsg && (
        <View style={styles.overlay}>
          <View style={styles.backdrop} />
          <View style={styles.dialog}>
            <View style={styles.smsIcon}>
              <Ionicons name="paper-plane" size={24} color="#fff" />
            </View>
            <Text style={styles.dialogTitle}>Zaproszenie wysłane</Text>
            <Text style={styles.dialogText}>{shareDoneMsg}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShareDoneMsg(null)}>
              <Text style={styles.primaryBtnText}>Gotowe</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function ReservationsCalendar({ reservations, onShare }: { reservations: Reservation[]; onShare: (r: Reservation) => void }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selected, setSelected] = useState<string | null>(null);

  const events = reservations.filter((r) => r.status !== 'cancelled');
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isoFor = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`;
  const resOnDay = (iso: string) => events.filter((r) => iso >= r.dateFrom && iso <= r.dateTo);

  const prev = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); setSelected(null); };
  const next = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); setSelected(null); };

  const selectedRes = selected ? resOnDay(selected) : [];

  return (
    <ScrollView contentContainerStyle={styles.calScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.calCard}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prev} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS_NOM[month]} {year}</Text>
          <TouchableOpacity onPress={next} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekHeader}>
          {WEEKDAYS.map((d) => <Text key={d} style={styles.weekHeaderText}>{d}</Text>)}
        </View>

        <View style={styles.calGrid}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={styles.calCell} />;
            const iso = isoFor(day);
            const res = resOnDay(iso);
            const r0 = res[0];
            const isToday = iso === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
            const sr = selectedRes.find((r) => iso >= r.dateFrom && iso <= r.dateTo);
            const inSel = !!sr;
            const selStart = inSel && iso === sr!.dateFrom;
            const selEnd = inSel && iso === sr!.dateTo;
            return (
              <TouchableOpacity
                key={`d${day}`}
                style={styles.calCell}
                onPress={() => setSelected(r0 ? iso : null)}
                activeOpacity={r0 ? 0.7 : 1}
              >
                {inSel && (
                  <View style={[styles.selBg, selStart && styles.selBgStart, selEnd && styles.selBgEnd]} />
                )}
                <Text style={[styles.calDay, isToday && styles.calDayToday, inSel && styles.calDaySel]}>{day}</Text>
                {!inSel && r0 && (
                  <View style={[
                    styles.eventBar,
                    { backgroundColor: r0.status === 'upcoming' ? colors.success : colors.textSecondary },
                    iso === r0.dateFrom && styles.eventBarStart,
                    iso === r0.dateTo && styles.eventBarEnd,
                  ]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Wydarzenia wybranego dnia */}
      {selected && selectedRes.length > 0 ? (
        <View style={styles.eventsWrap}>
          <Text style={styles.eventsTitle}>
            {parseIso(selected).getDate()} {MS[parseIso(selected).getMonth()]} {parseIso(selected).getFullYear()}
          </Text>
          {selectedRes.map((r) => (
            <View key={r.id} style={styles.eventCard}>
              <View style={styles.eventTop}>
                <View style={[styles.statusDot, { backgroundColor: r.status === 'upcoming' ? colors.success : colors.textSecondary }]} />
                <Text style={styles.eventFishery}>{r.fishery}</Text>
              </View>
              <Detail icon="calendar-outline" text={fmtRange(r)} />
              <Detail icon="grid-outline" text={`${r.spots.length > 1 ? 'Stanowiska' : 'Stanowisko'} ${spotsText(r.spots)}`} />
              <View style={styles.eventActions}>
                <TouchableOpacity style={styles.eventBtn} onPress={() => onShare(r)}>
                  <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                  <Text style={styles.eventBtnText}>Udostępnij</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.eventBtn} onPress={() => addToPhoneCalendar(r)}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.eventBtnText}>Do kalendarza</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.calHint}>
          <Ionicons name="hand-left-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.calHintText}>Dotknij dnia z paskiem, aby zobaczyć rezerwację</Text>
        </View>
      )}
    </ScrollView>
  );
}

function ReservationCard({ r, onCancel, onReview, onShare }: { r: Reservation; onCancel: () => void; onReview: () => void; onShare: () => void }) {
  const cancelled = r.status === 'cancelled';
  const completed = r.status === 'completed';
  const upcoming = r.status === 'upcoming';
  const confirmed = upcoming && !!r.confirmedAt;
  const pending = upcoming && !r.confirmedAt;
  const left = upcoming ? daysUntil(r.dateFrom) : null;
  const showReminder = upcoming && left !== null && left >= 0 && left <= 7;

  return (
    <View style={[styles.card, cancelled && styles.cardCancelled]}>
      <View style={styles.cardTop}>
        <View style={[
          styles.statusDot,
          { backgroundColor: confirmed ? colors.success : pending ? colors.water : cancelled ? colors.error : colors.textSecondary },
        ]} />
        <Text style={[styles.cardFishery, cancelled && styles.strike]}>{r.fishery}</Text>
        <View style={[
          styles.badge,
          confirmed ? styles.badgeUpcoming : pending ? styles.badgeDone : cancelled ? styles.badgeCancelled : styles.badgeDone,
        ]}>
          <Text style={[
            styles.badgeText,
            { color: confirmed ? colors.primaryLight : pending ? colors.water : cancelled ? colors.error : colors.textSecondary },
          ]}>
            {confirmed ? 'Potwierdzona ✅' : pending ? 'Oczekuje' : cancelled ? 'Anulowana' : 'Zakończona'}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Detail icon="calendar-outline" text={fmtRange(r)} />
        <Detail icon="grid-outline" text={`${r.spots.length > 1 ? 'Stanowiska' : 'Stanowisko'} ${spotsText(r.spots)}`} />
        <Detail icon="time-outline" text={`${r.days} ${r.days === 1 ? 'dzień' : 'dni'}`} />
        <Detail icon="card-outline" text={PAYMENT_LABELS[r.payment]} />
        <Detail icon="cash-outline" text={`${r.total} zł`} strong />
      </View>

      {showReminder && (
        <View style={styles.reminder}>
          <Ionicons name="notifications" size={14} color={colors.primary} />
          <Text style={styles.reminderText}>
            {left === 0 ? 'Zasiadka dziś!' : `Przypomnienie SMS · zasiadka za ${left} ${left === 1 ? 'dzień' : 'dni'}`}
          </Text>
        </View>
      )}

      {r.sharedWith.length > 0 && (
        <View style={styles.sharedChip}>
          <Ionicons name="people" size={13} color={colors.primary} />
          <Text style={styles.sharedChipText} numberOfLines={1}>
            Udostępniono: {r.sharedWith.join(', ')}
          </Text>
        </View>
      )}

      {upcoming && (
        <View style={styles.cardActionsRow}>
          <TouchableOpacity style={styles.smallAction} onPress={onShare}>
            <Ionicons name="person-add-outline" size={15} color={colors.primary} />
            <Text style={styles.smallActionText}>Udostępnij</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallAction} onPress={() => addToPhoneCalendar(r)}>
            <Ionicons name="calendar-outline" size={15} color={colors.primary} />
            <Text style={styles.smallActionText}>Do kalendarza</Text>
          </TouchableOpacity>
        </View>
      )}

      {completed && r.rating ? (
        <View style={styles.ratedRow}>
          <Text style={styles.ratedLabel}>Twoja ocena:</Text>
          <View style={{ flexDirection: 'row', gap: 1 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name={s <= r.rating! ? 'star' : 'star-outline'} size={15} color="#F59E0B" />
            ))}
          </View>
          <TouchableOpacity onPress={onReview}><Text style={styles.editReview}>Zmień</Text></TouchableOpacity>
        </View>
      ) : completed ? (
        <TouchableOpacity style={styles.reviewBtn} onPress={onReview}>
          <Ionicons name="star-outline" size={15} color={colors.primary} />
          <Text style={styles.reviewText}>Dodaj opinię</Text>
        </TouchableOpacity>
      ) : null}

      {upcoming && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Anuluj rezerwację</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Detail({ icon, text, strong }: { icon: any; text: string; strong?: boolean }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text style={[styles.detailText, strong && styles.detailStrong]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: colors.accent, marginTop: 3, fontWeight: '600' },
  bell: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  segment: { flexDirection: 'row', margin: 16, marginBottom: 4, backgroundColor: colors.border, borderRadius: 12, padding: 4 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: colors.primary, fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  list: { padding: 16, gap: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardCancelled: { opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardFishery: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  strike: { textDecorationLine: 'line-through', color: colors.textSecondary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeUpcoming: { backgroundColor: colors.accent + '20' },
  badgeDone: { backgroundColor: colors.border },
  badgeCancelled: { backgroundColor: colors.error + '18' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  details: { gap: 8 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: colors.textSecondary },
  detailStrong: { color: colors.text, fontWeight: '700' },
  reminder: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12,
    backgroundColor: colors.accent + '15', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  reminderText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  sharedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  sharedChipText: { fontSize: 12, color: colors.primary, fontWeight: '600', flex: 1 },
  cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.background, borderRadius: 10, paddingVertical: 9, borderWidth: 1, borderColor: colors.border,
  },
  smallActionText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  ratedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  ratedLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  editReview: { fontSize: 13, color: colors.primary, fontWeight: '700', marginLeft: 4 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, padding: 10, marginTop: 14 },
  reviewText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  cancelBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 },
  cancelText: { fontSize: 13, fontWeight: '600', color: colors.error },

  // Kalendarz
  calScroll: { padding: 16, paddingBottom: 32 },
  calCard: { backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  weekHeader: { flexDirection: 'row', marginTop: 8, marginBottom: 4 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center' },
  selBg: { position: 'absolute', top: 4, bottom: 4, left: 0, right: 0, backgroundColor: colors.primary },
  selBgStart: { left: 4, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  selBgEnd: { right: 4, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  calDay: { fontSize: 15, color: colors.text, fontWeight: '600' },
  calDayToday: { color: colors.primary, fontWeight: '900' },
  calDaySel: { color: '#fff', fontWeight: '900' },
  eventBar: { position: 'absolute', bottom: 5, left: 0, right: 0, height: 6 },
  eventBarStart: { left: 4, borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
  eventBarEnd: { right: 4, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  eventsWrap: { marginTop: 16, gap: 12 },
  eventsTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  eventCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  eventTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  eventFishery: { fontSize: 15, fontWeight: '700', color: colors.text },
  eventActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  eventBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.background, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
  },
  eventBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  calHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingHorizontal: 30 },
  calHintText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  dialog: {
    width: '100%', backgroundColor: '#fff', borderRadius: 22, padding: 22, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  warnIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.error + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  shareIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  smsIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
    backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, height: 50,
    borderWidth: 1, borderColor: colors.border, marginTop: 16,
  },
  input: { flex: 1, fontSize: 15, color: colors.text },
  dialogTitle: { fontSize: 19, fontWeight: '900', color: colors.text, textAlign: 'center' },
  dialogText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  dialogNote: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  starsRow: { flexDirection: 'row', gap: 8, marginVertical: 18 },
  dangerBtn: { backgroundColor: colors.error, borderRadius: 14, paddingVertical: 15, width: '100%', alignItems: 'center', marginTop: 18 },
  dangerBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, width: '100%', alignItems: 'center', marginTop: 18 },
  primaryBtnDisabled: { backgroundColor: colors.border },
  primaryBtnText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  ghostBtn: { paddingVertical: 12, marginTop: 2 },
  ghostBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
