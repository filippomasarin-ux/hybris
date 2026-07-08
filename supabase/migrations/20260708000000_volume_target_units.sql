-- volume_target used to store { sport: minutes }. Move to { sport: { valore, unita } }
-- so weekly targets can be expressed in km (corsa/ciclismo/nuoto/trail) or ore (altri sport).
UPDATE public.profiles
SET volume_target = (
  SELECT COALESCE(
    jsonb_object_agg(
      key,
      jsonb_build_object('valore', round((value::numeric / 60) * 10) / 10, 'unita', 'ore')
    ),
    '{}'::jsonb
  )
  FROM jsonb_each_text(volume_target)
  WHERE jsonb_typeof(volume_target -> key) = 'number'
)
WHERE volume_target IS NOT NULL AND volume_target != '{}'::jsonb;
