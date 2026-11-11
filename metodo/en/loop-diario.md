# The daily loop

1. **The queue:** COLA.md holds the pending pieces in order. The director takes the first one that is not blocked.
2. **The heartbeat:** every hour a script checks the studio without spending AI. If there are pieces and nobody is moving, it wakes the director.
3. **Visible jump every 4 hours:** if the game has gone 4 hours without a change you can notice, the heartbeat asks for the smallest visible piece that does not depend on data. Waiting for data does not stop everything.
4. **Case, build and test:** see [[caso-antes-de-construir]], [[gauntlet-a-ciegas]] and [[puerta-de-integracion]].
5. **Cutoff at 18:00:** master is frozen for publishing.
6. **Publishing at 19:00:** the day's version, a log entry and a video recap. See [[construir-en-publico]].
7. **Updates at 12:58 and 15:58:** what went in during the day is published without waiting for the night.

The studio board shows live the master game, what is coming and the alarms: game unchanged, machine in red or expired session.
