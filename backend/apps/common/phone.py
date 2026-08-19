import re


CAMEROON_OPERATOR_RANGES = {
    "MTN": [(650, 654), (670, 679), (680, 684)],
    "ORANGE": [(655, 659), (685, 689), (690, 699)],
    "NEXTTEL": [(660, 669)],
    "CAMTEL": [(620, 621)],
}


def digits_only(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def to_cameroon_national(value: str) -> str:
    digits = digits_only(value)
    if digits.startswith("237"):
        digits = digits[3:]
    return digits[:9]


def detect_cameroon_operator(value: str) -> str:
    national = to_cameroon_national(value)
    if len(national) < 3:
        return "UNKNOWN"
    try:
        prefix = int(national[:3])
    except ValueError:
        return "UNKNOWN"
    for operator, ranges in CAMEROON_OPERATOR_RANGES.items():
        if any(start <= prefix <= end for start, end in ranges):
            return operator
    return "UNKNOWN"


def normalize_cameroon_phone(value: str) -> dict:
    national = to_cameroon_national(value)
    operator = detect_cameroon_operator(national)
    is_mobile = national.startswith("6")
    is_fixed = national.startswith("2")
    valid = len(national) == 9 and ((is_mobile and operator != "UNKNOWN") or is_fixed)
    return {
        "input": value,
        "national": national,
        "e164": f"+237{national}" if national else "",
        "operator": operator if is_mobile else ("FIXED" if is_fixed and len(national) == 9 else "UNKNOWN"),
        "is_valid": valid,
        "is_mobile": is_mobile and operator != "UNKNOWN",
    }
