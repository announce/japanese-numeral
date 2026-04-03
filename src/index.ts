import { normalize, splitLargeNumberParts, largeNumbers, n2kan, zen2han } from './utils'
import japaneseNumerics from './japaneseNumerics'

function parseDecimalCoefficient(coefficient: string) {
  const normalized = zen2han(coefficient)
  const match = normalized.match(/^([0-9]+)\.([0-9]+)$/)

  if (!match) {
    return null
  }

  return {
    digits: BigInt(`${match[1]}${match[2]}`),
    scale: 10n ** BigInt(match[2].length),
  }
}

export function kanji2number(japanese: string) {
  japanese = normalize(japanese)

  if (japanese.match('〇') || japanese.match(/^[〇一二三四五六七八九]+$/)) {
    for (const key in japaneseNumerics) {
      const reg = new RegExp(key, 'g')
      japanese = japanese.replace(reg, japaneseNumerics[key].toString())
    }

    return Number(japanese)
  } else {
    let number = 0
    const { numbers, raw } = splitLargeNumberParts(japanese)

    // 万以上の数字を数値に変換
    for (const key in largeNumbers) {
      if (numbers[key]) {
        const decimal = parseDecimalCoefficient(raw[key])
        if (decimal) {
          const unit = BigInt(largeNumbers[key])
          if (unit % decimal.scale !== 0n) {
            throw new TypeError('The attribute of kanji2number() must be a Japanese numeral as integer.')
          }

          number = number + Number(decimal.digits * (unit / decimal.scale))
        } else {
          number = number + largeNumbers[key] * numbers[key]
        }
      }
    }

    if (!Number.isInteger(number) || !Number.isInteger(numbers['千'])) {
      throw new TypeError('The attribute of kanji2number() must be a Japanese numeral as integer.')
    }

    // 千以下の数字を足す
    return number + numbers['千']
  }
}


export function number2kanji(num: number) {
  if (!num.toString().match(/^[0-9]+$/)) {
    throw new TypeError('The attribute of number2kanji() must be integer.')
  }

  const kanjiNumbers = Object.keys(japaneseNumerics)
  let number = num
  let kanji = ''

  // 万以上の数字を漢字に変換
  for (const key in largeNumbers) {
    const n = Math.floor(number / largeNumbers[key])
    if (n) {
      number = number - (n * largeNumbers[key])
      kanji = `${kanji}${n2kan(n)}${key}`
    }
  }

  if (number) {
    kanji = `${kanji}${n2kan(number)}`
  }

  return kanji || '〇'
}

export function findKanjiNumbers(text: string) {
  const num = '([0-9０-９]*)|([〇一二三四五六七八九壱壹弐弍貳貮参參肆伍陸漆捌玖]*)'
  const decimalNum = '([0-9０-９]+[.．][0-9０-９]+|[0-9０-９]*)|([〇一二三四五六七八九壱壹弐弍貳貮参參肆伍陸漆捌玖]*)'
  // Decimal coefficients are only valid before large units (万/億/兆), not before 千/百/十
  const basePattern = `((${num})(千|阡|仟))?((${num})(百|陌|佰))?((${num})(十|拾))?(${num})?`
  const decimalBasePattern = `((${num})(千|阡|仟))?((${num})(百|陌|佰))?((${num})(十|拾))?(${decimalNum})?`
  const pattern = `(?<![0-9０-９.．])(((${decimalBasePattern}兆)?(${decimalBasePattern}億)?(${decimalBasePattern}(万|萬))?${basePattern}))`
  const regex = new RegExp(pattern, 'g')
  const matches = Array.from(text.matchAll(regex), (match) => match[1])
  if (matches.length) {
    return matches.filter((item) => {
      if ((! item.match(/^[0-9０-９.．]+$/)) && (item.length && '兆' !== item && '億' !== item && '万' !== item && '萬' !== item)) {
        return true
      } else {
        return false
      }
    })
  } else {
    return []
  }
}
