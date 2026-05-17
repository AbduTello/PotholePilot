"""
Seed script — submits ~50 realistic Detroit pothole reports through the live
Next.js API so every row gets real Granite extraction + priority scoring.

Requirements:
  - MCP server running:  cd mcp-server && python3 server.py
  - Next.js running:     npm run dev  (or npm start)

Usage:
  cd mcp-server
  python3 seed.py
"""

import asyncio
import httpx

NEXTJS_URL = "http://localhost:3000"

# Spread across Detroit neighborhoods / zip codes, including clusters (nearby coords)
# and low-income zips (48201, 48202, 48214) to trigger equity flags.
REPORTS = [
    # ── Midtown / Cass Corridor (48201) ──────────────────────────────────────
    {
        "description": "Massive pothole right outside Cass Tech High School on Second Ave. Kids walking to school are swerving into traffic to avoid it. It's been here for at least three weeks.",
        "address": "2501 Second Ave, Detroit, MI 48201",
        "lat": 42.3365, "lng": -83.0552,
    },
    {
        "description": "Deep hole on Cass Ave near the Wayne State campus. Hit it at 25mph and blew a tire. The crater is at least 8 inches deep and a foot wide.",
        "address": "Cass Ave & W Canfield St, Detroit, MI 48201",
        "lat": 42.3521, "lng": -83.0639,
    },
    {
        "description": "Pothole cluster on Willis St between Cass and Second. Three separate holes, one after the other. Very dangerous at night.",
        "address": "Willis St, Detroit, MI 48201",
        "lat": 42.3490, "lng": -83.0608,
    },
    {
        "description": "Large pothole on Woodward Ave in front of the Detroit Medical Center entrance. Ambulances have to swerve around it. Urgent repair needed.",
        "address": "4201 St Antoine St, Detroit, MI 48201",
        "lat": 42.3556, "lng": -83.0573,
    },
    {
        "description": "Bad road damage on Forest Ave near the hospital. Multiple potholes in a 50-foot stretch. Patients getting dropped off are walking through this mess.",
        "address": "Forest Ave & John R St, Detroit, MI 48201",
        "lat": 42.3561, "lng": -83.0558,
    },

    # ── New Center / Henry Ford (48202) ──────────────────────────────────────
    {
        "description": "Dangerous pothole on West Grand Blvd near Henry Ford Hospital. Huge — my car bottomed out. Heard a loud bang. This needs immediate attention.",
        "address": "2799 W Grand Blvd, Detroit, MI 48202",
        "lat": 42.3693, "lng": -83.1023,
    },
    {
        "description": "Pothole on Second Ave approaching the Henry Ford complex. I've seen two cars with flat tires in the past week on this same spot.",
        "address": "Second Ave & Bethune St, Detroit, MI 48202",
        "lat": 42.3701, "lng": -83.0998,
    },
    {
        "description": "Road is crumbling on Lothrop Ave near the school. Big chunks of asphalt missing. Kids are riding bikes and hitting these holes.",
        "address": "Lothrop Ave, Detroit, MI 48202",
        "lat": 42.3740, "lng": -83.0920,
    },

    # ── West Village / East Jefferson (48214) ────────────────────────────────
    {
        "description": "Pothole on Jefferson Ave near Belle Isle bridge. High traffic area. Multiple drivers honking and swerving. It's been growing for months.",
        "address": "E Jefferson Ave near Belle Isle, Detroit, MI 48214",
        "lat": 42.3303, "lng": -82.9942,
    },
    {
        "description": "Deep hole on Kercheval Ave in West Village. Hit it going 20mph and my alignment is shot. This is a residential street with lots of foot traffic.",
        "address": "Kercheval Ave, Detroit, MI 48214",
        "lat": 42.3490, "lng": -82.9940,
    },
    {
        "description": "Pothole right at the bus stop on Jefferson at Van Dyke. People stepping off the bus are tripping. Elderly residents are especially at risk here.",
        "address": "E Jefferson Ave & Van Dyke Ave, Detroit, MI 48214",
        "lat": 42.3362, "lng": -82.9700,
    },

    # ── Rosa Parks Transit Center area ───────────────────────────────────────
    {
        "description": "Huge pothole on Michigan Ave near Rosa Parks Transit Center. Hundreds of bus riders walk past this every day. It's a safety hazard and an embarrassment.",
        "address": "Michigan Ave near Rosa Parks Transit Center, Detroit, MI",
        "lat": 42.3314, "lng": -83.0484,
    },
    {
        "description": "Road damage on Bagley Ave one block from the transit center. Potholes everywhere after the last freeze. Buses are bouncing hard over this stretch.",
        "address": "Bagley Ave, Detroit, MI",
        "lat": 42.3320, "lng": -83.0500,
    },
    {
        "description": "Bad pothole at the corner of Michigan and Trumbull. Right at the crosswalk. I saw a cyclist go down hard last week trying to dodge it.",
        "address": "Michigan Ave & Trumbull Ave, Detroit, MI",
        "lat": 42.3318, "lng": -83.0510,
    },

    # ── Grand Circus Park area ────────────────────────────────────────────────
    {
        "description": "Pothole on Woodward Ave near Grand Circus Park station. Downtown corridor, very high pedestrian traffic. Multiple Uber/Lyft drivers complaining online.",
        "address": "Woodward Ave & Montcalm St, Detroit, MI",
        "lat": 42.3374, "lng": -83.0493,
    },
    {
        "description": "Cracked and buckled pavement on Park Ave between Comerica Park and the Fisher. Concertgoers walking this route every night. Serious trip hazard.",
        "address": "Park Ave, Detroit, MI",
        "lat": 42.3390, "lng": -83.0485,
    },

    # ── Northwest Detroit / Mumford / McNichols ───────────────────────────────
    {
        "description": "Giant pothole on McNichols Rd near Mumford High School. School buses are rattling over this daily. It's been reported before and never fixed.",
        "address": "W McNichols Rd, Detroit, MI",
        "lat": 42.4005, "lng": -83.1489,
    },
    {
        "description": "Deep hole on Livernois Ave near the school zone. Seen parents swerving with kids in the car. Definitely a hazard when school lets out.",
        "address": "Livernois Ave & McNichols Rd, Detroit, MI",
        "lat": 42.4010, "lng": -83.1480,
    },
    {
        "description": "Pothole on Puritan Ave near Palmer Park. Long stretch of bad pavement — at least four separate holes within 100 feet. Been this way since winter.",
        "address": "Puritan Ave near Palmer Park, Detroit, MI",
        "lat": 42.4114, "lng": -83.1199,
    },
    {
        "description": "Road surface completely deteriorated on Woodward near 7 Mile. Major commuter route. The potholes are so deep water pools in them after rain.",
        "address": "Woodward Ave & W 7 Mile Rd, Detroit, MI",
        "lat": 42.4198, "lng": -83.1009,
    },

    # ── MLK High School area ──────────────────────────────────────────────────
    {
        "description": "Pothole on Fenkell Ave near MLK High School. Students walk this route. The hole is large enough that bikes disappear into it. Very dangerous.",
        "address": "Fenkell Ave, Detroit, MI",
        "lat": 42.3767, "lng": -83.1561,
    },
    {
        "description": "Road damage on Schaefer Hwy approaching the school intersection. Chunk of asphalt missing — at least 2 feet across. Cars bottoming out daily.",
        "address": "Schaefer Hwy, Detroit, MI",
        "lat": 42.3780, "lng": -83.1570,
    },

    # ── Western International HS area ────────────────────────────────────────
    {
        "description": "Dangerous pothole on Vernor Hwy near Western International High School. Lots of foot traffic from students. Been here since the February thaw.",
        "address": "W Vernor Hwy, Detroit, MI",
        "lat": 42.3194, "lng": -83.1194,
    },
    {
        "description": "Multiple potholes on Springwells St in the school zone. Ice made them worse this winter. Some are over 6 inches deep.",
        "address": "Springwells St, Detroit, MI",
        "lat": 42.3200, "lng": -83.1200,
    },

    # ── Gratiot / 7 Mile NE ───────────────────────────────────────────────────
    {
        "description": "Pothole at the 7 Mile and Gratiot bus stop. People getting on and off buses every 15 minutes. The hole has been growing since January.",
        "address": "7 Mile Rd & Gratiot Ave, Detroit, MI",
        "lat": 42.4295, "lng": -82.9854,
    },
    {
        "description": "Bad road damage on Gratiot Ave between 6 and 7 Mile. High-speed corridor, potholes are dangerous. Two accidents reported nearby last month.",
        "address": "Gratiot Ave, Detroit, MI",
        "lat": 42.4200, "lng": -82.9900,
    },
    {
        "description": "Large pothole on Mack Ave near Chandler Park. Families drive this to get to the park on weekends. Hit it and heard a loud crack from under my car.",
        "address": "Mack Ave near Chandler Park, Detroit, MI",
        "lat": 42.4037, "lng": -82.9697,
    },

    # ── Sinai-Grace Hospital area ─────────────────────────────────────────────
    {
        "description": "Pothole on Outer Drive near Sinai-Grace Hospital. Emergency vehicles take this route. Deep hole — I've seen ambulances bounce hard going over it.",
        "address": "W Outer Dr near Sinai-Grace Hospital, Detroit, MI",
        "lat": 42.4073, "lng": -83.2004,
    },
    {
        "description": "Road damage on Joy Rd approaching the hospital. Long stretch of deteriorating asphalt. Multiple potholes in a row — worst section is near the entrance.",
        "address": "Joy Rd, Detroit, MI",
        "lat": 42.4080, "lng": -83.2010,
    },

    # ── Downtown / Lafayette Park (48226 / 48207) ─────────────────────────────
    {
        "description": "Pothole on Jefferson Ave near the RiverWalk. Tourists and joggers use this stretch heavily. The hole appeared after the last freeze-thaw cycle.",
        "address": "E Jefferson Ave, Detroit, MI 48207",
        "lat": 42.3310, "lng": -83.0350,
    },
    {
        "description": "Road damage on Lafayette Blvd in the historic district. Well-maintained area otherwise — this pothole is very out of place and getting complaints from residents.",
        "address": "Lafayette Blvd, Detroit, MI 48226",
        "lat": 42.3340, "lng": -83.0510,
    },
    {
        "description": "Pothole on Congress St near the courthouse. High foot traffic, government workers and attorneys walking this daily. It's right at the crosswalk.",
        "address": "Congress St, Detroit, MI 48226",
        "lat": 42.3295, "lng": -83.0463,
    },

    # ── Eastside / Grosse Pointe border ──────────────────────────────────────
    {
        "description": "Large pothole on Mack Ave near the Grosse Pointe border. High traffic. The pavement condition drops off badly in this section — classic under-investment.",
        "address": "Mack Ave, Detroit, MI",
        "lat": 42.3900, "lng": -82.9500,
    },
    {
        "description": "Pothole on Harper Ave in the east side. Deep and jagged edges. I called 311 three weeks ago — still nothing. This area always gets ignored.",
        "address": "Harper Ave, Detroit, MI",
        "lat": 42.3950, "lng": -82.9600,
    },

    # ── Southwest Detroit ─────────────────────────────────────────────────────
    {
        "description": "Pothole on Dix Ave in Southwest Detroit. Industrial truck traffic makes it worse every day. Hole is wide enough to swallow a tire.",
        "address": "Dix Ave, Detroit, MI",
        "lat": 42.3000, "lng": -83.1400,
    },
    {
        "description": "Road damage on Fort St near the bridge approach. Trucks from the Ambassador Bridge create huge vibrations. Pavement is breaking apart in chunks.",
        "address": "Fort St, Detroit, MI",
        "lat": 42.3050, "lng": -83.0900,
    },
    {
        "description": "Deep pothole on Vernor near the Mexican Village restaurants. Weekend crowds park on this street. Several cars have been towed with flat tires.",
        "address": "W Vernor Hwy & Lawndale St, Detroit, MI",
        "lat": 42.3230, "lng": -83.1050,
    },

    # ── North End ─────────────────────────────────────────────────────────────
    {
        "description": "Pothole on Oakland Ave near the North End neighborhood. Long-neglected area, roads are terrible. This particular hole has been here for two months.",
        "address": "Oakland Ave, Detroit, MI",
        "lat": 42.3850, "lng": -83.0710,
    },
    {
        "description": "Multiple potholes on Woodward between Boston Blvd and Chicago Blvd. Residential stretch, lots of kids on bikes. The freeze-thaw this winter destroyed this block.",
        "address": "Woodward Ave, Detroit, MI",
        "lat": 42.3800, "lng": -83.0850,
    },

    # ── Brightmoor / NW ───────────────────────────────────────────────────────
    {
        "description": "Massive pothole on Fenkell Ave in Brightmoor. This neighborhood is already underserved — roads here are in worse shape than anywhere else I've driven in Detroit.",
        "address": "Fenkell Ave, Detroit, MI",
        "lat": 42.4100, "lng": -83.2300,
    },
    {
        "description": "Road completely broken up on Plymouth Rd near the Brightmoor bus route. Elderly residents depend on this bus. The potholes are making it inaccessible.",
        "address": "Plymouth Rd, Detroit, MI",
        "lat": 42.4050, "lng": -83.2200,
    },

    # ── Clusters: 3 reports on same block (within 100m) ──────────────────────
    {
        "description": "Big pothole on Michigan Ave near Trumbull. Reported by multiple neighbors. It's right in front of a bus stop and keeps getting worse.",
        "address": "Michigan Ave & Trumbull Ave, Detroit, MI",
        "lat": 42.3319, "lng": -83.0505,
    },
    {
        "description": "Same pothole on Michigan Ave at Trumbull — submitting again because nothing has been done. It caused a flat tire on my wife's car yesterday.",
        "address": "Michigan Ave & Trumbull Ave, Detroit, MI",
        "lat": 42.3317, "lng": -83.0508,
    },
    {
        "description": "The pothole at Michigan and Trumbull is still not fixed. Third report. Dangerous for cyclists who use the bike lane here.",
        "address": "Michigan Ave & Trumbull Ave, Detroit, MI",
        "lat": 42.3321, "lng": -83.0502,
    },

    # More scattered reports
    {
        "description": "Pothole on I-75 service drive near New Center. Not a highway issue but the service road is city-maintained. Deep hole, swerving traffic.",
        "address": "I-75 Service Dr, Detroit, MI",
        "lat": 42.3750, "lng": -83.0850,
    },
    {
        "description": "Road damage on Seven Mile near the western bus stop. Wide pothole — I watched a cyclist crash into it. The city needs to fix this immediately.",
        "address": "W 7 Mile Rd, Detroit, MI",
        "lat": 42.4180, "lng": -83.1500,
    },
    {
        "description": "Pothole on Dexter Ave in the Virginia Park neighborhood. Small street but lots of pedestrian traffic. The hole is deep and filled with standing water.",
        "address": "Dexter Ave, Detroit, MI",
        "lat": 42.3700, "lng": -83.1200,
    },
    {
        "description": "Large pothole on Van Dyke Ave near the eastside school. Hit it with my van and bent a rim. This pothole has been there since last fall.",
        "address": "Van Dyke Ave, Detroit, MI",
        "lat": 42.3850, "lng": -82.9850,
    },
    {
        "description": "Road surface deteriorating on Chicago Blvd. This is a historic neighborhood and the roads are an embarrassment. Multiple potholes, worst near the intersection.",
        "address": "Chicago Blvd, Detroit, MI",
        "lat": 42.3860, "lng": -83.1050,
    },
    {
        "description": "Deep pothole on Tireman Ave in West Detroit. Truck traffic from the industrial area makes it worse. The hole is now about a foot deep after the last rain.",
        "address": "Tireman Ave, Detroit, MI",
        "lat": 42.3400, "lng": -83.1600,
    },
]


async def seed():
    print(f"Seeding {len(REPORTS)} reports through {NEXTJS_URL}/api/reports")
    print("Make sure both Next.js and the MCP server are running.\n")

    success = 0
    failed = 0

    async with httpx.AsyncClient(timeout=90) as client:
        for i, report in enumerate(REPORTS, 1):
            data = {
                "description": report["description"],
                "address":     report["address"],
                "lat":         str(report["lat"]),
                "lng":         str(report["lng"]),
            }
            try:
                res = await client.post(f"{NEXTJS_URL}/api/reports", data=data)
                body = res.json()
                score = body.get("priority_score", "pending")
                print(f"[{i:02d}/{len(REPORTS)}] {res.status_code} score={score}  {report['address'][:50]}")
                success += 1
            except Exception as e:
                print(f"[{i:02d}/{len(REPORTS)}] ERROR: {e}")
                failed += 1

            # Pace requests to avoid hammering watsonx rate limits
            await asyncio.sleep(1.5)

    print(f"\nDone. {success} succeeded, {failed} failed.")


if __name__ == "__main__":
    asyncio.run(seed())
