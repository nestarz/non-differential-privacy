from moviepy.editor import *
import os

base = "/Users/eliasrhouzlane/Movies/Kaptures/"

videoPaths = [
    os.path.join(base, name)
    for name in [
        "Kapture 2020-05-17 at 22.04.52.mp4",
        "Kapture 2020-05-17 at 22.05.30.mp4",
        "Kapture 2020-05-17 at 3.20.28.mp4",
    ]
]

videos = [VideoFileClip(video) for video in videoPaths]
result = clips_array(
    [
        [
            concatenate_videoclips(
                [videos[0], videos[1], videos[0].set_duration(30)]
            ).resize((1652, 1650)),
            concatenate_videoclips([videos[0].set_duration(38), videos[2]]).resize(
                (1652, 1650)
            ),
        ]
    ]
)

result.write_videofile(
    "output.mp4",
    codec="libx264",
    audio_codec="aac",
    temp_audiofile="temp-audio.m4a",
    remove_temp=True,
    fps=25,
)
