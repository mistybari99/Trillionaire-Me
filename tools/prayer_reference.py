# Independent reference for the prayer-time formula (src/core/prayer.ts).
# Method: JPL-grade solar ephemeris from pyephem (pip install ephem), with the SAME method angles as the app.
# Each event is found by scanning the sun's geometric centre altitude minute by minute and bisecting to the second,
# so the reference does not depend on pyephem's own rise/set convention (its limb/semidiameter handling).
# Output is rounded to the nearest minute. Run: python3 tools/prayer_reference.py
import math, datetime, ephem

LAT, LON = 23.8103, 90.4125            # Dhaka default
FAJR_ANGLE, ISHA_ANGLE = 18.0, 17.0    # sun below the horizon (deg)
MAGHRIB_ALT = -0.833                   # sun centre altitude used for sunset
ASR_SHADOW_FACTOR = 1                  # standard Asr
DHAKA = datetime.timedelta(hours=6)

sun = ephem.Sun()

def alt_deg(t):
    o = ephem.Observer(); o.lat, o.lon, o.elev, o.pressure = str(LAT), str(LON), 10, 0; o.date = t
    sun.compute(o)
    return math.degrees(float(sun.alt)), float(sun.dec)

def crossing(t0, t1, target_fn, rising):
    """First time in [t0, t1] where the sun's altitude crosses target (rising or setting), by minute scan + bisection."""
    step = datetime.timedelta(minutes=1)
    t = t0
    prev = alt_deg(t)[0] - target_fn(alt_deg(t)[1])
    while t < t1:
        nxt = t + step
        cur = alt_deg(nxt)[0] - target_fn(alt_deg(nxt)[1])
        if (prev < 0 <= cur if rising else prev >= 0 > cur):
            lo, hi = t, nxt
            for _ in range(20):
                mid = lo + (hi - lo) / 2
                v = alt_deg(mid)[0] - target_fn(alt_deg(mid)[1])
                if (v < 0) == (prev < 0): lo = mid
                else: hi = mid
            return lo + (hi - lo) / 2
        prev, t = cur, nxt
    return None

def to_local(t):
    d = t + DHAKA + datetime.timedelta(seconds=30)   # nearest minute
    return d.strftime("%H:%M")

def ref_times(y, m, d):
    start = datetime.datetime(y, m, d) - DHAKA       # Dhaka midnight as UTC
    # solar noon: time of maximum altitude in Dhaka 11:00-13:00 (start is Dhaka midnight), by minute scan then ternary search
    best, bt = -999, None
    t = start + datetime.timedelta(hours=11)
    while t < start + datetime.timedelta(hours=13):
        a = alt_deg(t)[0]
        if a > best: best, bt = a, t
        t += datetime.timedelta(minutes=1)
    lo, hi = bt - datetime.timedelta(minutes=1), bt + datetime.timedelta(minutes=1)
    for _ in range(30):
        a1 = alt_deg(lo + (hi - lo) / 3)[0]; a2 = alt_deg(lo + 2 * (hi - lo) / 3)[0]
        if a1 < a2: lo = lo + (hi - lo) / 3
        else: hi = lo + 2 * (hi - lo) / 3
    noon = lo + (hi - lo) / 2
    fajr = crossing(start, noon, lambda dec: -FAJR_ANGLE, True)
    maghrib = crossing(noon, noon + datetime.timedelta(hours=12), lambda dec: MAGHRIB_ALT, False)
    isha = crossing(noon, noon + datetime.timedelta(hours=12), lambda dec: -ISHA_ANGLE, False)
    # Asr: the altitude threshold depends on the sun's declination at that moment (read inside crossing()).
    phi = math.radians(LAT)
    thr = lambda dec: math.degrees(math.atan(1.0 / (ASR_SHADOW_FACTOR + math.tan(abs(phi - dec)))))  # dec is in radians
    asr = crossing(noon, noon + datetime.timedelta(hours=12), thr, False)
    return {"fajr": to_local(fajr), "dhuhr": to_local(noon), "asr": to_local(asr), "maghrib": to_local(maghrib), "isha": to_local(isha)}

if __name__ == "__main__":
    for (y, m, d) in [(2026, 1, 15), (2026, 3, 20), (2026, 6, 21), (2026, 10, 24), (2026, 12, 21)]:
        print(f"{y}-{m:02d}-{d:02d}", ref_times(y, m, d))
