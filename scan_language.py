
import os
import re

blocked_phrases = {
    "Therapy": "Skill-based support",
    "Therapeutic exercise": "Short settling activity",
    "Treatment": "Supportive practice",
    "Clinical": "School-appropriate",
    "Diagnosis": "Understanding patterns",
    "Mental health issue": "Everyday stress response",
    "Psychological problem": "Internal pressure",
    "Disorder": "Strong pattern",
    "Symptoms": "Signals",
    "Trauma work": "Gentle skill-building",
    "You are anxious": "You may feel unsettled",
    "You are stressed": "Things may feel heavy",
    "You are overwhelmed": "A lot may be happening inside",
    "You are distracted": "Focus can feel harder right now",
    "You lack focus": "Attention may be scattered",
    "Emotionally unstable": "Strong feelings can show up",
    "Dysregulated": "Hard to settle at the moment",
    "Overreacting": "Responding strongly",
    "Too sensitive": "Noticing things deeply",
    "Problem student": "Student needing support",
    "At-risk student": "Student needing extra care",
    "Difficult child": "Child having a hard moment",
    "Fix your behaviour": "Support settling before learning",
    "Control your emotions": "Allow feelings to move",
    "Manage your emotions": "Give emotions some space",
    "Calm down": "Take a short pause",
    "Relax": "Let the body ease a little",
    "Stay calm": "Go at your own pace",
    "Be strong": "Give yourself space",
    "Be resilient": "Move gently through this",
    "Try harder": "Do less, not more",
    "Push through": "Pause for a moment",
    "Power through": "Take a breather",
    "Focus harder": "Let focus come back naturally",
    "Discipline yourself": "Give yourself structure",
    "Self-control": "Self-awareness",
    "Must": "You can choose",
    "Should": "You might try",
    "Required": "Optional",
    "Mandatory": "Available if helpful",
    "Do this now": "When you are ready",
    "Follow these steps": "Here is one option",
    "Complete the activity": "Try this if you want",
    "Don’t skip": "You can stop anytime",
    "Daily habit": "One-time try",
    "Commit to this": "Come back if helpful",
    "Stick to it": "Use when it feels useful",
    "Never skip": "No requirement",
    "Track your progress": "Notice what helps",
    "Measure improvement": "Pay attention to how it feels",
    "Evaluate yourself": "Simply observe",
    "Test your emotions": "Check in gently",
    "Improve performance": "Support learning readiness",
    "Boost productivity": "Reduce internal noise",
    "Achieve results": "Notice small shifts",
    "Master this skill": "Try it once",
    "Optimize focus": "Support focus",
    "High-performing students": "Students learn differently",
    "Normal students": "Every student is different",
    "Better than others": "No comparison needed",
    "Falling behind": "Moving at your own pace",
    "Catch up": "Take one step",
    "Weak mindset": "Tired system",
    "Lazy": "Low energy moment",
    "Not trying": "Carrying a lot",
    "Poor coping": "Still learning skills",
    "Emotional weakness": "Strong internal experience",
    "Breakdown": "Overload moment",
    "Meltdown": "Big reaction",
    "Out of control": "Feeling unsteady",
    "Share your feelings": "Keep this private",
    "Open up": "Notice internally",
    "Talk about your trauma": "Stay with what feels safe",
    "Express everything": "Share only if you choose",
    "Be vulnerable": "Stay comfortable",
    "Reveal your emotions": "Quiet reflection",
    "Amygdala hijack": "Body reacting",
    "Cortisol spike": "Stress response",
    "Brain malfunction": "Body under pressure",
    "Nervous system disorder": "Busy nervous system",
    "Emotional regulation problem": "Learning regulation skills",
    "Coping mechanism": "Supportive habit",
    "Triggered": "Something felt familiar",
    "Trauma response": "Protective response",
    "Deep emotional work": "Gentle skill practice",
    "Inner healing": "Creating ease",
    "Fix yourself": "Nothing to fix",
    "Heal yourself": "Allow settling",
    "Eliminate stress": "Reduce pressure",
    "Get rid of feelings": "Let feelings pass",
    "Earn points for calm": "Notice personal ease",
    "Lose progress": "No tracking involved",
    "Reward for focus": "Feeling more settled",
    "Punishment for skipping": "Always optional",
    "Success looks like": "This may feel helpful",
    "Failure to complete": "You can stop anytime",
    "Correct response": "Any response is okay",
    "Right way to feel": "No right or wrong",
    "Fix what’s wrong": "Support what’s present",
    "Improve yourself": "Learn about yourself",
    "Mental health": "Everyday stress response (contextual)",
    "Trauma": "Gentle skill-building (contextual)"
}

# Single word checks to be careful with
caution_words = ["Fix", "Correct", "Heal", "Treat", "Cure", "Diagnose", "Therapy", "Disorder", "Dysfunction", "Behaviour management"]

root_dir = r"c:\Users\jatin\OneDrive\Desktop\hh\JaagrMind-v0\frontend\src"

print(f"Scanning {root_dir}...")

for subdir, dirs, files in os.walk(root_dir):
    for file in files:
        if not file.endswith(('.jsx', '.js', '.tsx', '.ts')):
            continue
            
        filepath = os.path.join(subdir, file)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            lines = content.split('\n')
            for i, line in enumerate(lines):
                # Check for blocked phrases
                for phrase, replacement in blocked_phrases.items():
                    if phrase.lower() in line.lower():
                        print(f"[MATCH] {file}:{i+1} -> Found '{phrase}'. Suggestion: '{replacement}'")
                        print(f"   Line: {line.strip()[:100]}...")

                # Check for caution words
                for word in caution_words:
                     if re.search(r'\b' + re.escape(word) + r'\b', line, re.IGNORECASE):
                        print(f"[CAUTION] {file}:{i+1} -> Found restricted word '{word}'")
                        print(f"   Line: {line.strip()[:100]}...")

        except Exception as e:
            print(f"Error reading {filepath}: {e}")
