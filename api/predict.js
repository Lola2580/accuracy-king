import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req, res) {
  try {

    // 1️⃣ Fetch Lottery Data
    const response = await fetch(
      "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?t=" + Date.now()
    );

    const json = await response.json();

    if (!json.data?.list) {
      return res.status(200).json({ prediction: "No Data" });
    }

    const results = json.data.list.map(r => ({
      digit: r.number
    }));

    if (results.length < 6) {
      return res.status(200).json({ prediction: "Not Enough Data" });
    }

    // 2️⃣ Make Sequence
    const seq = results.slice(0, 5).map(r => r.digit).join('');
    const next = results[5].digit;

    // 3️⃣ Check in DB
    const { data } = await supabase
      .from("predictions")
      .select("*")
      .eq("sequence", seq)
      .maybeSingle();

    if (data) {
      let arr = data.next_numbers.split(",");

      if (!arr.includes(next)) {
        arr.push(next);

        await supabase
          .from("predictions")
          .update({ next_numbers: arr.join(",") })
          .eq("sequence", seq);
      }

      return res.status(200).json({ prediction: data.next_numbers });

    } else {

      await supabase
        .from("predictions")
        .insert([{ sequence: seq, next_numbers: next }]);

      return res.status(200).json({ prediction: next });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
