"""Word-box edge intersections for generating crop review candidates only.

Boxes and rectangles use (left, top, right, bottom) in the same coordinates.
An intersection does not establish that a visible word or relevant text is cut.
"""


def crosses(word, rect):
    x0, y0, x1, y1 = word[:4]
    a, b, c, d = rect
    result = []
    if y1 > b and y0 < d:
        if x0 < a < x1:
            result.append('left')
        if x0 < c < x1:
            result.append('right')
    if x1 > a and x0 < c:
        if y0 < b < y1:
            result.append('top')
        if y0 < d < y1:
            result.append('bottom')
    return result
