import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { sendToDialogflow } from "./dialogflowClient";
import "./index.css"; // Tailwind styles

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function App() {
  const [alarm, setAlarm] = useState("off");
  const [override, setOverride] = useState("off");
  const [movieNight, setMovieNight] = useState("off");
  const [manualTranscript, setManualTranscript] = useState("");
  const [listening, setListening] = useState(false);

  // ✅ Realtime Firebase listeners
  useEffect(() => {
    const alarmRef = ref(db, "alarm");
    const overrideRef = ref(db, "override");
    const movieRef = ref(db, "movie_night");

    onValue(alarmRef, (snapshot) => {
      if (snapshot.exists()) setAlarm(snapshot.val());
    });

    onValue(overrideRef, (snapshot) => {
      if (snapshot.exists()) setOverride(snapshot.val());
    });

    onValue(movieRef, (snapshot) => {
      if (snapshot.exists()) setMovieNight(snapshot.val());
    });
  }, []);

  // ✅ Manual speech recognition
  const manualStartListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("❌ Your browser does not support Web Speech API.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎤 Manual recognition started");
      setListening(true);
      setManualTranscript("");
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      console.log("🎙️ Manual result:", spokenText);
      setManualTranscript(spokenText);
    };

    recognition.onerror = (e) => {
      console.error("❌ Manual error:", e.error);
      alert("Error: " + e.error);
      setListening(false);
    };

    recognition.onend = () => {
      console.log("🛑 Manual recognition ended");
      setListening(false);
    };

    recognition.start();
  };

  // ✅ Voice command handling
  const handleVoice = async () => {
    if (!manualTranscript.trim()) {
      alert("❗ Say something before sending to Dialogflow.");
      return;
    }

    const result = await sendToDialogflow(manualTranscript);
    console.log("Dialogflow result:", result);

    const intent = result?.intent?.displayName;
    const params = result?.parameters;

    if (!intent) {
      alert("❌ No intent detected.");
      return;
    }

    if (intent === "alarm_toggle") {
      const val = params?.state;
      if (val) {
        set(ref(db, "alarm"), val);
        alert("✅ Alarm updated via voice!");
      }
    } else if (intent === "override_toggle") {
      const val = params?.state;
      if (val) {
        set(ref(db, "override"), val);
        alert("✅ Override updated via voice!");
      }
    } else if (intent === "movie_night_toggle") {
      const val = params?.state;
      if (val) {
        set(ref(db, "movie_night"), val);
        alert("🎬 Movie Night mode set via voice!");
      }
    } else {
      alert(`⚠️ Unknown command: ${intent}`);
    }

    setManualTranscript("");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold">🏠 Home Automation Dashboard + Voice</h1>

      <div className="flex gap-4 flex-wrap justify-center">
        <button className="px-4 py-2 bg-yellow-600 rounded" onClick={manualStartListening}>
          🎤 Manual Voice Test
        </button>
        <button className="px-4 py-2 bg-blue-600 rounded" onClick={handleVoice}>
          🚀 Send to Dialogflow
        </button>
      </div>

      <div className="text-sm text-gray-300">
        🎙️ Listening:{" "}
        <span className={listening ? "text-green-400" : "text-red-400"}>
          {listening ? "Yes" : "No"}
        </span>
      </div>

      <p className="text-green-400 mt-2 max-w-lg text-center">
        Transcript: <em>{manualTranscript || "🎧 Waiting for your voice..."}</em>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Alarm */}
        <div className="bg-gray-800 p-6 rounded-2xl text-center">
          <h2 className="text-xl mb-2">🚨 Alarm</h2>
          <p className="mb-2">Current: <strong>{alarm}</strong></p>
          <button
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
            onClick={() => set(ref(db, "alarm"), alarm === "on" ? "off" : "on")}
          >
            Toggle Alarm
          </button>
        </div>

        {/* Override */}
        <div className="bg-gray-800 p-6 rounded-2xl text-center">
          <h2 className="text-xl mb-2">🛡️ Override</h2>
          <p className="mb-2">Current: <strong>{override}</strong></p>
          <button
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded"
            onClick={() => set(ref(db, "override"), override === "on" ? "off" : "on")}
          >
            Toggle Override
          </button>
        </div>

        {/* Movie Night */}
        <div className="bg-gray-800 p-6 rounded-2xl text-center">
          <h2 className="text-xl mb-2">🎬 Movie Night</h2>
          <p className="mb-2">Current: <strong>{movieNight}</strong></p>
          <button
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
            onClick={() =>
              set(ref(db, "movie_night"), movieNight === "on" ? "off" : "on")
            }
          >
            Toggle Movie Mode
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
