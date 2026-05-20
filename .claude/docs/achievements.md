# Achievements Reference

All achievement definitions in `js/achievements.js`. Stored as `state.achievements = { [id]: timestampMs }`.

`Achievements.check(state)` is called after every `ctx.save()` in `app.js`. Returns an array of newly unlocked achievements; each triggers a toast notification.

## Achievement List

| ID | Name | Icon | Trigger |
|---|---|---|---|
| `first_review` | First Responder | 🚑 | `totalReviews >= 1` |
| `ten_reviews` | Getting Started | 📚 | `totalReviews >= 10` |
| `fifty_reviews` | Building Momentum | ⚡ | `totalReviews >= 50` |
| `hundred_reviews` | Dedicated Student | 🎯 | `totalReviews >= 100` |
| `five_hundred_reviews` | Study Machine | 🔥 | `totalReviews >= 500` |
| `first_note` | Note Taker | 📝 | Any step note written |
| `ten_notes` | Detailed Notes | 📓 | 10+ step notes written |
| `first_drill_mastered` | Drill Sergeant | 🎖️ | Any drill on any sheet mastered |
| `order_mastered_first` | In Order | 🔢 | Section order mastered on any sheet |
| `stepseq_mastered_first` | Step by Step | 👣 | Step sequence mastered in any section |
| `whatnext_mastered_first` | What Comes Next | ➡️ | What's Next? mastered on any sheet |
| `first_recall_attempt` | From Memory | 🧠 | First blank recall attempt on any sheet |
| `good_recall` | Memory Champion | 🏆 | Blank recall ≥ 80% on any sheet |
| `perfect_recall` | Total Recall | 💯 | Blank recall 100% on any sheet |
| `recall_three_sheets` | Recall Ace | 🃏 | Blank recall ≥ 80% on 3+ sheets |
| `spoken_script_pass` | Verbal Fluency | 🎤 | Spoken script ≥ 80% on any sheet |
| `spoken_script_mastered` | Script Master | 📢 | Spoken script mastered (3 runs ≥80%) on any sheet |
| `streak_3` | Consistent | 📅 | `longestStreak >= 3` |
| `streak_7` | Week Warrior | 🗓️ | `longestStreak >= 7` |
| `streak_30` | Monthly Scholar | 🌟 | `longestStreak >= 30` |
| `all_drills_one_sheet` | Complete Package | 🏅 | All 5 drill types mastered/good on one sheet |
| `all_drills_three_sheets` | Triple Threat | 🥇 | All 5 drill types mastered/good on 3 sheets |

## Notes
- `totalReviews` is incremented on every drill submission (order, stepseq, whatnext, blankrecall, spokenscript).
- `spoken_script_pass` uses `rec.lastScore.pct >= 80` (lastScore is an object `{ correct, total, pct }`).
- `all_drills_one_sheet` requires: secorder mastered, stepseq all sections mastered, whatnext mastered, blankrecall ≥ 80%, spokenscript mastered.
- Locked achievements show "???" for their description in the UI (mystery reveal on unlock).
