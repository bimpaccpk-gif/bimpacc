# Periodic Video Watermark Plan

## Goal

Keep the student identity watermark available as a deterrent without covering the lesson video continuously.

## Playback behavior

1. Keep the watermark hidden before playback begins.
2. Show it as soon as the video starts playing.
3. Hide it after approximately 8 seconds.
4. Show it again after a randomly selected active-playback interval between 3 and 4 minutes.
5. Repeat the 8-second display and 3–4 minute interval for the rest of the playback session.
6. Pause the recurrence countdown while the video is paused and reset it when a different video loads.

## Implementation

- Encapsulate the timing lifecycle in a client-side React hook.
- Drive the hook from the YouTube player's actual playing/paused state.
- Render the existing moving identity watermark only while the hook reports that it is visible.
- Clear all timers when the video changes or the player unmounts.

## Verification

- Confirm the watermark is absent before the first play.
- Confirm it appears immediately after playback starts and hides after about 8 seconds.
- Confirm it reappears only after 3–4 minutes of active playback.
- Confirm paused time does not advance the recurrence countdown.
- Confirm the cycle repeats and all type/lint/build checks pass.
