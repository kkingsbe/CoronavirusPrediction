var confirmedArray, forecastConfirmed
var confirmedA, confirmedB
var deathsArray, forecastDeaths
var deathsA, deathsB
var recoveredArray, forecastRecovered
var recoveredA, recoveredB
var forecastLength = 7 //How many days into the future are forecasted

async function main() {
  await getData()

  regressData("confirmed", confirmedArray)
  regressData("deaths", deathsArray)
  regressData("recovered", recoveredArray)

  forecastConfirmed = forecastRange("confirmed")
  forecastDeaths = forecastRange("deaths")
  forecastRecovered = forecastRange("recovered")

  console.log(deathsArray)

  plotData("confirmed")
  plotData("deaths")
  plotData("recovered")
}

async function getData() {
  var confirmedTimeSeries = await getConfirmed()
  confirmedArray = timeSeriesToArray(confirmedTimeSeries)
  var deathsTimeSeries = await getDeaths()
  deathsArray = timeSeriesToArray(deathsTimeSeries)
  var recoveredTimeSeries = await getRecovered()
  recoveredArray = timeSeriesToArray(recoveredTimeSeries)
}

async function getConfirmed() {
  return await getCovidData("https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv")
}
async function getDeaths() {
  return await getCovidData("https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv")
}
async function getRecovered() {
  return await getCovidData("https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv")
}

async function getCovidData(fileUrl) {
  let series = {}
  return new Promise((resolve, reject) => {
    fetch(fileUrl)
    .then(response => {
      return response.json()
    })
    .then(data => {
      let decoded = atob(data.content)
      csv({
        output: "json"
      })
      .fromString(decoded)
      .then(result => {
        result.forEach(region => {
          if(region["Country/Region"] == "US") {
            //console.log(region)
            for(date in region) {
              //Skip if not a date
              if(!Date.parse(date)) {
                continue
              }
              if(typeof(series[date]) == "undefined") {
                series[date] = 0
              }
              series[date] += parseInt(region[date])
            }
          }
        })
        resolve(series)    
      })
    })
    .catch(err => {
      reject(err)
    })
  })
}

function timeSeriesToArray(series) {
  let array = []
  for(var i = 0; i < Object.keys(series).length; i++) {
    array.push([i, series[Object.keys(series)[i]]])
  }
  if(isNaN(array[array.length-1][1])) {
    array.pop()
  }
  return array
}

//Finds the a and b constants for the exponential equation
function regressData(dataSet, data) {
  let trimmedData = []
  for(var i = 0; i < data.length; i++) {
    if(data[i][1] != 0) break
  }
  for(let x = i; x < data.length; x++) {
    trimmedData.push(data[x])
  }
  console.log(trimmedData)
  let result = regression("exponential", trimmedData)
  a = result.equation[0]
  b = result.equation[1]
  switch(dataSet) {
    case "confirmed":
      confirmedA = a
      confirmedB = b
      break 
    case "deaths":
      deathsA = a
      deathsB = b
      break
    case "recovered":
      recoveredA = a
      recoveredB = b
      break
  }
  console.log(result)
}

function forecast(dataSet, daySinceEpoch) {
  let a, b
  switch(dataSet) {
    case "confirmed":
      a = confirmedA
      b = confirmedB
      break 
    case "deaths":
      a = deathsA
      b = deathsB
      break
    case "recovered":
      a = recoveredA
      b = recoveredB
      break
  }
  return a * Math.exp(b * daySinceEpoch)
}

function forecastRange(dataSet) {
  let forcastArr = []
  for(var i = 0; i <= confirmedArray.length + forecastLength; i++) {
    forcastArr.push([i, forecast(dataSet, i)])
  }
  return forcastArr
}

function plotData(dataSet) {
  let plot, arr, forecastArr, x, y, forecastX, forecastY, markers, fitline, data, layout
  switch(dataSet) {
    case "confirmed":
      plot = document.getElementById("confirmedCasesGraph")
      forecastArr = forecastConfirmed
      arr = confirmedArray
      x = []
      y = []
      arr.forEach(point => {
        x.push(point[0])
        y.push(point[1])
      })
      forecastX = []
      forecastY = []
      forecastArr.forEach(point => {
        forecastX.push(point[0])
        forecastY.push(point[1])
      })
      markers = {
        x: x,
        y: y,
        name: "Confirmed Cases",
        mode: "markers"
      }
      fitLine = {
        x: forecastX,
        y: forecastY,
        name: "Forecast Cases",
        mode: "lines"
      }
      data = [fitLine, markers]
      layout = {
        title: `COVID-19 Cases in the US <br /> ${confirmedA} x e <sup>${confirmedB}x</sup>`,
        xaxis: {title: "Days since January 22, 2020"},
        yaxis: {title: "Number of confirmed cases"}
      }
      Plotly.newPlot(plot, data, layout, {responsive: true})
      break 
    case "deaths":
      plot = document.getElementById("deathsGraph")
      forecastArr = forecastDeaths
      arr = deathsArray
      x = []
      y = []
      arr.forEach(point => {
        x.push(point[0])
        y.push(point[1])
      })
      forecastX = []
      forecastY = []
      forecastArr.forEach(point => {
        forecastX.push(point[0])
        forecastY.push(point[1])
      })
      markers = {
        x: x,
        y: y,
        name: "Confirmed Deaths",
        mode: "markers"
      }
      fitLine = {
        x: forecastX,
        y: forecastY,
        name: "Forecast Deaths",
        mode: "lines"
      }
      data = [fitLine, markers]
      layout = {
        title: `COVID-19 deaths in the US <br /> ${confirmedA} x e <sup>${confirmedB}x</sup>`,
        xaxis: {title: "Days since January 22, 2020"},
        yaxis: {title: "Number of confirmed deaths"}
      }
      Plotly.newPlot(plot, data, layout, {responsive: true})
      break
    case "recovered":
      plot = document.getElementById("recoveriesGraph")
      forecastArr = forecastRecovered
      arr = recoveredArray
      x = []
      y = []
      arr.forEach(point => {
        x.push(point[0])
        y.push(point[1])
      })
      forecastX = []
      forecastY = []
      forecastArr.forEach(point => {
        forecastX.push(point[0])
        forecastY.push(point[1])
      })
      markers = {
        x: x,
        y: y,
        name: "Confirmed Recoveries",
        mode: "markers"
      }
      fitLine = {
        x: forecastX,
        y: forecastY,
        name: "Forecast Recoveries",
        mode: "lines"
      }
      data = [fitLine, markers]
      layout = {
        title: `COVID-19 recoveries in the US <br /> ${confirmedA} x e <sup>${confirmedB}x</sup>`,
        xaxis: {title: "Days since January 22, 2020"},
        yaxis: {title: "Number of confirmed recoveries"}
      }
      Plotly.newPlot(plot, data, layout, {responsive: true})
      break
  }
}

main()